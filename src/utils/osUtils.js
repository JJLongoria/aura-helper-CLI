const os = require('os');

class OSUtils {

    static isLinux(){
        return os.platform() === 'linux';
    }

    static isWindows(){
        return os.platform() === 'win32';
    }

    static getAvailableCPUs(){
        return os.cpus().length;
    }

}
module.exports = OSUtils;