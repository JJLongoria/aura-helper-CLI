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

    static getApiVersion(apiVersion) {
        if (apiVersion.match(/^\d+\.\d+$/)) {
            let integerPart = apiVersion;
            if (apiVersion.indexOf('.') !== -1)
                integerPart = apiVersion.split('.')[0];
            return integerPart + '.0';
        }
        return undefined;
    }
}
module.exports = Utils;