const fs = require('fs');
const hardwareFreq = [1188, 918, 648, 384, 'IDLE'];
function parseCommand() {
    return new Promise(((resolve, reject )=> {
        fs.readFile(process.argv[2], (err, data) => {
            if (err) return reject(err);
            if (process.argv[3] !== 'EDF' && process.argv[3] !== 'RM') return reject(new Error('Unknown algorithm'));
            if (process.argv[4] !== 'EE' && process.argv[4] !== undefined) return reject(new Error('Unknown energy efficient'));
            let executionDuration;
            let hardware = [];
            let tasks = [];
            try {
                let fileData = data.toString('utf8');
                fileData = fileData.split('\n').map((row) => row.split(' '));
                let tasksNumber = parseInt(fileData[0][0]);
                executionDuration = parseInt(fileData[0][1]);
                for (let i = 2; i < fileData[0].length; i++) hardware.push({
                    power: parseInt(fileData[0][i]),
                    frequency: hardwareFreq[i-2],
                });
                for (let i = 1; i <= tasksNumber; i ++) {
                    let execution = [];
                    for (let j = 2; j < fileData[i].length; j++) execution.push(parseInt(fileData[i][j]));
                    tasks.push({
                        name: fileData[i][0],
                        period: parseInt(fileData[i][1]),
                        execution,
                    })
                }
            } catch (e) {
                return reject(new Error('Failed to parse input file'));
            }
            resolve({
                executionDuration,
                algorithm: process.argv[3],
                EE: process.argv[4] === 'EE',
                hardware,
                tasks,
            })
        })
    }))
}

function sortRM (tasks) {
    return tasks.sort((a,b) => a.period-b.period)
}

function sortEDF (tasks) {
    return tasks.sort((a,b) => a.deadline-b.deadline)
}

function schedule({tasks, executionDuration, algorithm, hardware}) {
    let EDF = algorithm === 'EDF';
    let sort = EDF ? sortEDF : sortRM;
    let currentTime = 0;
    let hardwareUsed = 0;
    let readyList = [];
    let energy = []
    tasks.forEach(task => {
        let taskEnergy = {};
        for (let i =0; i < hardware.length-1; i ++) {
            let consumption = hardware[i].power * task.execution[i];
            // we only care about energy reduction if using slower hardware increases consumption we ignore it
            if (i === 0 || consumption < taskEnergy[i-1].consumption) {
                taskEnergy[i] = {consumption, util: task.execution[i]/task.period, execution: task.execution[i]}
            }
        }
        energy.push(taskEnergy)
        readyList.push({
            name: task.name,
            arrival: currentTime,
            period: task.period,
            remainingExecution: task.execution[hardwareUsed],
            wcet: task.execution[hardwareUsed],
            deadline: currentTime + task.period,
        })
    });
    // TODO find combination of energy with highest utilization
    console.log(energy);
    readyList = sort(readyList);
    let executionOrder = [];
    let executingTask = -1;
    while (currentTime < executionDuration) {
        for (let i = 0; i < readyList.length; i++) {
            let currentTask = readyList[i];
            if (currentTask.arrival <= currentTime) {
                executingTask = i;
                let lastExecutedTask;
                if (executionOrder.length === 0) {
                    lastExecutedTask = {}
                } else {
                    lastExecutedTask = executionOrder[executionOrder.length-1];
                }
                if (lastExecutedTask.name !== currentTask.name) {
                    executionOrder.push({
                        start: currentTime,
                        hardware: hardware[hardwareUsed],
                        name: readyList[i].name,
                    });
                }
                break;
            }
        }

        if (executingTask > -1) {
            let currentTask = readyList[executingTask];
            // console.log(currentTime, currentTask.name);
            currentTask.remainingExecution--;
            // task completed
            if (currentTask.remainingExecution === 0) {
                currentTask.arrival += currentTask.period;
                currentTask.deadline = currentTask.arrival + currentTask.period;
                currentTask.remainingExecution = currentTask.wcet;
                if (EDF) readyList = sort(readyList);
                executingTask = -1;
            }
        } else {
            let lastExecutedTask = executionOrder[executionOrder.length-1];
            if (lastExecutedTask.name !== 'IDLE') {
                executionOrder.push({
                    start: currentTime,
                    hardware: hardware[hardware.length-1],
                    name: 'IDLE',
                });
            }
        }
        executionOrder[executionOrder.length-1].end = currentTime;
        readyList.forEach((task) => {
            if (task.deadline < currentTime) {
                console.error(task);
                throw new Error('Missed a deadline')
            }
        });
        currentTime++;
    }
    return executionOrder;
}

function processOutput(data) {
    let output = {
        energy: 0,
        idle: 0,
        execution: 0,
    };
    return data.reduce((aggregated, row) => {
        let execution = row.end - row.start + 1;
        let energyConsumed = row.hardware.power * execution / 1000;
        if (row.name === 'IDLE') {
            aggregated.idle += execution;
        } else {
            aggregated.execution += execution;
        }
        aggregated.energy += energyConsumed;
        console.log(`${row.start} ${row.name} ${row.hardware.frequency} ${execution} ${energyConsumed}J`);
        return aggregated;
    }, output)
}

parseCommand().then(data => {
    console.dir(data, { depth: null });
    let output = processOutput(schedule(data));
    console.log(`Total energy Consumed: ${output.energy}J, idle: ${(output.idle/data.executionDuration*100).toFixed(2)}% (${output.idle}/${data.executionDuration}), execution: ${(output.execution/data.executionDuration*100).toFixed(2)}% (${output.execution}/${data.executionDuration})`)
}).catch(err => {
    if (err.message === 'Missed a deadline') {
        console.error('Missed a deadline for the task above');
    }
    console.error (err)
})
