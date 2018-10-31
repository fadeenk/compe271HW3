let power = require('./power');

function sortRM (tasks) {
    return tasks.sort((a,b) => a.period-b.period)
}

function sortEDF (tasks) {
    return tasks.sort((a,b) => a.deadline-b.deadline)
}

function schedule({tasks, executionDuration, algorithm, hardware, EE}) {
    // identify which algorithm is being used
    let EDF = algorithm === 'EDF';
    let sort = EDF ? sortEDF : sortRM;
    let currentTime = 0;
    let readyList = [];
    // get the hardware to use for each task based on if we are going for energy efficient or not
    const hardwareToUse = power.getHardwareToUse(tasks, hardware, executionDuration, EE);
    // generate the ready list at time 0
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
    // sort the ready list based on the algorithm
    readyList = sort(readyList);
    // create execution order array used for outputting data
    let executionOrder = [];
    let executingTask = -1;
    while (currentTime < executionDuration) {
        // check ready list to find which task needs to be executed at the current time
        for (let i = 0; i < readyList.length; i++) {
            let currentTask = readyList[i];
            // check that the task arrival (ready to be executed)
            if (currentTask.arrival <= currentTime) {
                // start executing the task
                executingTask = i;
                // get last executed task
                let lastExecutedTask;
                if (executionOrder.length === 0) {
                    lastExecutedTask = {}
                } else {
                    lastExecutedTask = executionOrder[executionOrder.length-1];
                }
                // if the task is different update the execution order to include the new task
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

        // There is a task being executed at the current time
        if (executingTask > -1) {
            let currentTask = readyList[executingTask];
            currentTask.remainingExecution--;
            // task completed
            if (currentTask.remainingExecution === 0) {
                // update the arrival time, deadline and remaining execution for the task
                currentTask.arrival += currentTask.period;
                currentTask.deadline = currentTask.arrival + currentTask.period;
                currentTask.remainingExecution = currentTask.wcet;
                // if edf resort the readyList because of the task new deadline
                if (EDF) readyList = sort(readyList);
                // finish executing this time
                executingTask = -1;
            }
        } else {
            // no task is available to be executed
            // add idle to the execution order if not there
            let lastExecutedTask = executionOrder[executionOrder.length-1];
            if (lastExecutedTask.name !== 'IDLE') {
                executionOrder.push({
                    start: currentTime,
                    hardware: hardware[hardware.length-1],
                    name: 'IDLE',
                });
            }
        }
        // update the end in case the next cycle is a different task/event
        executionOrder[executionOrder.length-1].end = currentTime;
        // check for missed deadlines
        readyList.forEach((task) => {
            if (task.deadline < currentTime) {
                let err = new Error('Missed a deadline');
                err.task = task;
                err.executionOrder = executionOrder;
                throw err;
            }
        });
        currentTime++;
    }
    return executionOrder;
}

module.exports = {schedule};