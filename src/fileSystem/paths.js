const path = require('path');
const os = require('os');
const FileReader = require('./fileReader').FileReader;
const StrUtils = require('../utils/strUtils');

class Paths {
    static getBasename(filePath) {
        return path.basename(filePath);
    }
    static getFolderPath(filePath) {
        return StrUtils.replace(path.dirname(filePath), '\\', '/');
    }
    static getBundleHelperPath(filePath) {
        return filePath.replace('.cmp', '').replace('.auradoc', '').replace('.svg', '').replace('.css', '').replace('.design', '').replace('.app', '').replace('.app', 'Renderer.js').replace('.app', 'Controller.js') + 'Helper.js';
    }
    static getBundleControllerPath(filePath) {
        return filePath.replace('.cmp', '').replace('.auradoc', '').replace('.svg', '').replace('.css', '').replace('.design', '').replace('.app', '').replace('.app', 'Renderer.js').replace('.app', 'Helper.js') + 'Controller.js';
    }
    static getBundleRendererPath(filePath) {
        return filePath.replace('.cmp', '').replace('.auradoc', '').replace('.svg', '').replace('.css', '').replace('.design', '').replace('.app', '').replace('.app', 'Controller.js').replace('.app', 'Helper.js') + 'Renderer.js';
    }
    static getAbsolutePath(fileOrFolder) {
        return StrUtils.replace(path.resolve(fileOrFolder), '\\', '/');
    }
    static getAppPath() {
        let result = [];
        let systemPaths = process.env.PATH.split(';');
        for (const systemPath of systemPaths) {
            try {
                let files = FileReader.readDirSync(systemPath);
                if (files.includes('aura-helper'))
                    result.push(systemPath + '/aura-helper');
                else if (files.includes('aura-helper.exe'))
                    result.push(systemPath + '/aura-helper.exe');
            } catch (error) {

            }
        }
        return result;
    }
}
exports.Paths = Paths;