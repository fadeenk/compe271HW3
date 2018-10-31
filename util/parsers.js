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
                // convert data buffer for the file to a string
                let fileData = data.toString('utf8');
                // parse the data to cells where each space is a column and new line a row
                fileData = fileData.split('\n').map((row) => row.split(' '));
                let tasksNumber = parseInt(fileData[0][0]);
                executionDuration = parseInt(fileData[0][1]);
                // generate hardware object where it links power consumption to its frequency
                for (let i = 2; i < fileData[0].length; i++) hardware.push({
                    power: parseInt(fileData[0][i]),
                    frequency: hardwareFreq[i-2],
                });
                // generate task objects
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
            // return the parsed command data to the caller function
            return resolve({
                executionDuration,
                algorithm: process.argv[3],
                EE: process.argv[4] === 'EE',
                hardware,
                tasks,
            })
        })
    }))
}

function processOutput(data) {
    // create object to track metrics required
    let output = {
        energy: 0,
        idle: 0,
        execution: 0,
    };
    // reduce the many records into a single output object
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

module.exports = {
    parseCommand,
    processOutput,
}