const { ProjectUtils } = require('@ah/core').CoreUtils;

class Utils {
    static getProgressAvailableTypes() {
        return [
            'plaintext',
            'json'];
    }

    static hasEmptyArgs(args, argsNames){
        let nEmpty = 0;
        for(let argName of argsNames){
            if(args[argName] === undefined){
                nEmpty++;
            }
        }
        return nEmpty === argsNames.length;
    }
}
module.exports = Utils;