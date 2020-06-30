const path = require('path');
const os = require('os');
const FileReader = require('./fileReader').FileReader;
const StrUtils = require('../utils/strUtils');

class Paths {
    static getBasename(filePath) {
        return StrUtils.replace(path.basename(filePath), "\\", "/");
    }
    static getFolderPath(filePath) {
        return StrUtils.replace(path.dirname(filePath), '\\', '/');
    }
    static getAbsolutePath(fileOrFolder) {
        return StrUtils.replace(path.resolve(fileOrFolder), '\\', '/');
    }
    static getAuraHelperCLITempFilesPath() {
        return StrUtils.replace(os.homedir() + '/AuraHelperCLI/TempFiles', "\\", "/");
    }
    static getAppPath() {
        let result = [];
        let systemPaths = process.env.PATH.split(';');
        for (let systemPath of systemPaths) {
            systemPath = StrUtils.replace(systemPath, "\\", "/");
            try {
                let files = FileReader.readDirSync(systemPath);
                if (files.includes('aura-helper'))
                    result.push(systemPath + '/aura-helper');
                else if (files.includes('aura-helper.exe'))
                    result.push(systemPath + '/aura-helper.exe');
                else if (files.includes('ah'))
                    result.push(systemPath + '/ah');
                else if (files.includes('ah.exe'))
                    result.push(systemPath + '/ah.exe');
            } catch (error) {
                
            }
        }
        return result;
    }
}
exports.Paths = Paths;