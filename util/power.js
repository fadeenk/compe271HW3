function getHardwareToUse(tasks, hardware, executionDuration, EE) {
    // if not energy efficient use the first hardware in the list for all tasks
    if (!EE) return tasks.map(() => 0);
    // else generate the different sets of data to use to create the combinations
    const sets = [];
    tasks.forEach((task) => {
        const set = [];
        // for each hardware for a specific task generate a the consumption and utilization for that task/hardware combo
        hardware.forEach((device, index) => {
            set.push({
                hardware: index,
                consumption: device.power * task.execution[index] * executionDuration/task.period,
                util: task.execution[index]/task.period,
            });
        });
        sets.push(set);
    });
    // generate the different combinations that can be used to execute the tasks
    // source for combination generating code was taken from https://stackoverflow.com/a/47701395
    const combinations = sets.reduce((a, b) => a.reduce((r, v) => r.concat(b.map(w => [].concat(v, w))), []));
    // filter out combinations that will not work (utilization > 1)
    const filtered = combinations.filter(combo => combo.reduce((acc, task) => acc + task.util, 0) < 1);
    // sort the working combinations based on energy consumption and pick the best case (lowest power consumption)
    const bestCase = filtered.sort((a, b) => a.reduce((acc, c) => c.consumption + acc, 0)-b.reduce((acc, c) => c.consumption + acc, 0))[0];
    return bestCase.map((task) => task.hardware);
}

module.exports = {getHardwareToUse};