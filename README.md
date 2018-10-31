# Energy efficient RM & EDF Scheduling

## Requirements
### Note: You can use either or depending on what you have available/ more convenient for you
- [NodeJS](https://nodejs.org/en/)
- [Docker](https://www.docker.com/get-started)

## Execution command
The command looks like this `node index.js input algorithm [energy-efficient]`
- node is the runtime executor for the code
- index.js is the source code to be executed
- the rest of the fields are the input and they are defined below

### The format
Name                   | Type     |Description                                
 -----------------------|----------|------------------------------------------------
 input  | String  | The input file to read and process for scheduling
 algorithm | String | The algorithm to use for scheduling. `RM` or `DEF`
 energy-efficient | String | Should it optimize for lowest energy consumption. This is an optional field it can only be set to `EE`
 
## How to execute
### Using node: 
  * call the execution command from terminal in the project directory
  * `$command`
### Using docker:
  * update docker-compose command
    * `bash -c "cd /var/HW3 && $command"`
  * Run the docker container
    * `docker-compose up`
    
## Input format
The system supports dynamically sized input as long as it looks like this.

\# of tasks | execution time | \# of power units consumed per hardware | ... | \# of power units consumed idle                           
------------|----------|---------------------------------|----------|-----
Task Name | period/deadline | power consumed per hardware | ... |
Task Name | period/deadline | power consumed per hardware | ... |
Task Name | period/deadline | power consumed per hardware | ... |
... | ... | ... | ... |
