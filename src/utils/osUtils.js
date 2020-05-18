const os = require('os');

class OSUtils {

    static isLinux(){
        return os.platform() === 'linux';
    }

    static isWindows(){
        return os.platform() === 'win32';
    }

    static getAvailableCPUs(){
        let cpus = os.cpus().length;
        if(cpus > 2)
            cpus -= 1;
        return cpus;
    }

}
module.exports = OSUtils;