const fileSystem = require('../fileSystem');
const ProcessManager = require('../processes').ProcessManager;
const ProcessEvent = require('../processes').ProcessEvent;
const Paths = fileSystem.Paths;
const FileReader = fileSystem.FileReader;

class Config {

    static getAuthUsername(root) {
        return new Promise(async function (resolve, reject) {
            let defaultUsername = JSON.parse(FileReader.readFileSync(root + '/.sfdx/sfdx-config.json')).defaultusername;
            let out = await ProcessManager.listAuthOurgs();
            if (out.stdOut) {
                let listOrgsResult = JSON.parse(out.stdOut);
                let username;
                if (listOrgsResult.status === 0) {
                    for (const org of listOrgsResult.result) {
                        if (defaultUsername.indexOf('@') !== -1) {
                            if (org.username && org.username.toLowerCase().trim() === defaultUsername.toLowerCase().trim())
                                username = org.username;
                        } else {
                            if (org.alias && org.alias.toLowerCase().trim() === defaultUsername.toLowerCase().trim())
                                username = org.username;
                        }
                        if (!username && ((org.username && org.username.toLowerCase().trim() === defaultUsername.toLowerCase().trim()) || (org.alias && org.alias.toLowerCase().trim() === defaultUsername.toLowerCase().trim())))
                            username = org.username;
                    }
                }
                resolve(username);
            } else {
                reject(out.stdErr);
            }
        });
    }

    static getServerInstance(username) {
        return new Promise(async function (resolve, reject) {
            let out = await ProcessManager.listAuthOurgs();
            if (out.stdOut) {
                let listOrgsResult = JSON.parse(out.stdOut);
                if (listOrgsResult.status === 0) {
                    for (const org of listOrgsResult.result) {
                        if (org.username === username) {
                            resolve(org.instanceUrl);
                        }
                    }
                }
                resolve(undefined);
            } else {
                reject(out.stdErr);
            }
        });
    }

    static getProjectConfig(projectFolder) {
        return JSON.parse(FileReader.readFileSync(projectFolder + '/sfdx-project.json'));
    }

    static getPackage(){
        console.log(process.cwd());
    }
}
module.exports = Config;