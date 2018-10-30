let power = require('./power');

function sortRM (tasks) {
    return tasks.sort((a,b) => a.period-b.period)
}

function sortEDF (tasks) {
    return tasks.sort((a,b) => a.deadline-b.deadline)
}

function schedule({tasks, executionDuration, algorithm, hardware, EE}) {
    let EDF = algorithm === 'EDF';
    let sort = EDF ? sortEDF : sortRM;
    let currentTime = 0;
    let readyList = [];
    const hardwareToUse = power.getHardwareToUse(tasks, hardware, executionDuration, EE);
    tasks.forEach((task, index) => {
        readyList.push({
            name: task.name,
            arrival: currentTime,
            period: task.period,
            hardware: hardwareToUse[index],
            remainingExecution: task.execution[hardwareToUse[index]],
            wcet: task.execution[hardwareToUse[index]],
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
                    executionOrder.push({
                        start: currentTime,
                        hardware: hardware[currentTask.hardware],
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

module.exports = {schedule};