const parsers = require('./util/parsers');
const scheduling = require('./util/scheduling');

parsers.parseCommand().then(input => {
    const output = scheduling.schedule(input);
    const summary = parsers.processOutput(output);
    console.log(`Total energy Consumed: ${summary.energy}J, idle: ${(summary.idle/input.executionDuration*100).toFixed(2)}% (${summary.idle}/${input.executionDuration}), execution: ${(summary.execution/input.executionDuration*100).toFixed(2)}% (${summary.execution}/${input.executionDuration})`)
}).catch(err => {
    if (err.message === 'Missed a deadline') {
        console.error('Missed a deadline for the task above');
    } else {
        console.error('Unknown error occurred see details below')
        console.error(err)
    }
})
