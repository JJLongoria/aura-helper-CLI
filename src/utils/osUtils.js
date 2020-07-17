const os = require('os');

class OSUtils {

    static isLinux(){
        return os.platform() === 'linux';
    }

    static isWindows(){
        return os.platform() === 'win32';
    }

    static isMac(){
        return os.platform() === 'darwin';
    }

    static getAvailableCPUs(){
        let cpus = os.cpus().length;
        if(cpus > 1)
            cpus -= 1;
        return cpus;
    }

}
module.exports = OSUtils;