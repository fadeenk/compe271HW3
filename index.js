const parsers = require('./util/parsers');
const scheduling = require('./util/scheduling');

parsers.parseCommand().then(input => {
    const output = scheduling.schedule(input);
    const summary = parsers.processOutput(output);
    console.log(`Total energy Consumed: ${summary.energy.toFixed(2)}J, idle: ${(summary.idle/input.executionDuration*100).toFixed(2)}% (${summary.idle}/${input.executionDuration}), execution: ${(summary.execution/input.executionDuration*100).toFixed(2)}% (${summary.execution}/${input.executionDuration})`);
}).catch(err => {
    if (err.message === 'Missed a deadline') {
        parsers.processOutput(err.executionOrder);
        const task = err.task;
        console.error(`Missed the deadline of ${task.deadline} for the task ${task.name} that arrived at ${task.arrival} with remaining execution of ${task.remainingExecution}/${task.wcet}`);
    } else {
        console.error('Unknown error occurred see details below');
        console.error(err);
    }
});
