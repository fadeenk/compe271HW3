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
    tasks.forEach(task => {
        readyList.push({
            name: task.name,
            arrival: currentTime,
            period: task.period,
            execution: task.execution[hardwareUsed],
            wcet: task.execution[hardwareUsed],
            deadline: currentTime + task.period,
        })
    });
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
                    lastExecutedTask.end = currentTime - 1;
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
            currentTask.execution--;
            // task completed
            if (currentTask.execution === 0) {
                currentTask.arrival += currentTask.period;
                currentTask.deadline = currentTask.arrival + currentTask.period;
                currentTask.execution = currentTask.wcet;
                if (EDF) readyList = sort(readyList);
                executingTask = -1;
            }
        } else {
            // console.log(currentTime, 'IDLE')
        }
        readyList.forEach((task) => {
            if (task.deadline < currentTime) throw new Error('Missed a deadline')
        });
        currentTime++;
    }
    return executionOrder;
}

parseCommand().then(data => {
    console.dir(data, { depth: null });
    let executionOrder = schedule(data);
    // console.dir(executionOrder, {depth: null});
    
})