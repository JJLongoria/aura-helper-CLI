const { FileReader } = require('@ah/core').FileSystem;
const { ProcessFactory, ProcessHandler } = require('@ah/core').ProcessManager;

class Config {

    static getAuthUsername(root) {
        return new Promise(async function (resolve, reject) {
            try {
                let defaultUsername = JSON.parse(FileReader.readFileSync(root + '/.sfdx/sfdx-config.json')).defaultusername;
                const process = ProcessFactory.listAuthOurgs();
                const listOrgsResult = await ProcessHandler.runProcess(process);
                if (listOrgsResult) {
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
                }
                resolve(undefined);
            } catch (error) {
                reject(error);
            }
        });
    }

    static getServerInstance(username) {
        return new Promise(async function (resolve, reject) {
            const process = ProcessFactory.listAuthOurgs();
            try {
                const respose = await ProcessHandler.runProcess(process);
                if (respose) {
                    let listOrgsResult = JSON.parse(respose);
                    if (listOrgsResult.status === 0) {
                        for (const org of listOrgsResult.result) {
                            if (org.username === username) {
                                resolve(org.instanceUrl);
                            }
                        }
                    }
                }
                resolve(undefined);
            } catch (error) {
                reject(error);
            }
        });
    }
}
module.exports = Config;