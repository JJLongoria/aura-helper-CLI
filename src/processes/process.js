const childProcess = require('child_process');
const ProcessEvent = require('./processEvent');


class Process {

    constructor(command, args, options) {
        this.command = command || '';
        this.args = args || [];
        this.options = options || {};
    }

    run(callback) {
        this.process = childProcess.spawn(this.command, this.args, this.options);
        this.process.stdout.on('data', (data) => {
            let dataStr = data.toString();
            if (callback)
                callback.call(this, ProcessEvent.STD_OUT, data);
        });
        this.process.stderr.on('data', (data) => {
            let dataStr = data.toString();
            if (callback)
                callback.call(this, ProcessEvent.ERR_OUT, data);
        });
        this.process.on('error', (data) => {
            if (callback)
                callback.call(this, ProcessEvent.ERROR, data);
        });
        this.process.on('close', (code) => {
            if (this.process.killed) {
                if (callback)
                    callback.call(this, ProcessEvent.KILLED);
            } else {
                if (callback)
                    callback.call(this, ProcessEvent.END, code);
            }

        });
    }

    kill() {
        if (this.process)
            this.process.kill();
    }

}
module.exports = Process;