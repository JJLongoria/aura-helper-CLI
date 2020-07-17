const Process = require('./process');
const fileSystem = require('../fileSystem');
const Paths = fileSystem.Paths;
const ProcessEvent = require('./processEvent');
const BUFFER_SIZE = 1024 * 500000;
const OSUtils = require('../utils/osUtils');

class ProcessManager {

    static updateNPM(output) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('npm');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'npm';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('install');
        commandArgs.push('-g');
        commandArgs.push('aura-helper-cli');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process, output).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static listAuthOurgs() {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:auth:list');
        commandArgs.push('--json');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static listMetadataTypes(user) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:mdapi:describemetadata');
        commandArgs.push('--json');
        commandArgs.push('-u');
        commandArgs.push(user);
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static describeSchemaMetadata(user, metadataType) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:schema:sobject:describe');
        commandArgs.push('--json');
        commandArgs.push('-u');
        commandArgs.push(user);
        commandArgs.push('-s');
        commandArgs.push(metadataType);
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static describeMetadata(user, metadata, folderName) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:mdapi:listmetadata');
        commandArgs.push('--json');
        commandArgs.push('-u');
        commandArgs.push(user);
        commandArgs.push('-m');
        commandArgs.push(metadata);
        if (folderName) {
            commandArgs.push('--folder');
            commandArgs.push(folderName);
        }
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static retrieveSFDX(user, packageFile, projectFolder) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:source:retrieve');
        commandArgs.push('--json');
        commandArgs.push('-u');
        commandArgs.push(user);
        commandArgs.push('-x');
        commandArgs.push(packageFile);
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE, cwd: projectFolder });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }


    static destructiveChanges(user, destructiveFolder) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:mdapi:deploy');
        commandArgs.push('--json');
        commandArgs.push('-u');
        commandArgs.push(user);
        commandArgs.push('-d');
        commandArgs.push(destructiveFolder);
        commandArgs.push('-w');
        commandArgs.push('-1');
        let process = new Process('cmd', ['/c', 'sfdx', 'force:mdapi:deploy', '--json', '-u', user, '-d', '' + destructiveFolder + '', '-w', '-1'], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static deployReport(user, jobId) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:mdapi:deploy:report');
        commandArgs.push('--json');
        commandArgs.push('-u');
        commandArgs.push(user);
        commandArgs.push('-i');
        commandArgs.push(jobId);
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static cancelDeploy(user, jobId) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('mdapi:deploy:cancel');
        commandArgs.push('--json');
        commandArgs.push('-u');
        commandArgs.push(user);
        commandArgs.push('-i');
        commandArgs.push(jobId);
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static query(user, query) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:data:soql:query');
        commandArgs.push('--json');
        commandArgs.push('-u');
        commandArgs.push(user);
        commandArgs.push('-q');
        commandArgs.push(query);
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static queryToolingAPI(user, query) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:data:soql:query');
        commandArgs.push('--json');
        commandArgs.push('-u');
        commandArgs.push(user);
        commandArgs.push('-q');
        commandArgs.push(query);
        commandArgs.push('-t');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static gitLog(root) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('git');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'git';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('log');
        commandArgs.push('--pretty=medium');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE, cwd: root });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static gitGetBranches(root) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('git');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'git';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('branch');
        commandArgs.push('-a');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE, cwd: root });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static gitDiff(root, source, target) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('git');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'git';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('diff');
        commandArgs.push(source);
        if (target) {
            commandArgs.push(target);
        }
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE, cwd: root });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static gitFetch(root) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('git');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'git';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('fetch');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE, cwd: root });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static convertToSFDX(packageFolder, packageFile, targetFolder) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:mdapi:convert');
        commandArgs.push('-r');
        commandArgs.push(packageFolder);
        commandArgs.push('--manifest');
        commandArgs.push(packageFile);
        commandArgs.push('-d');
        commandArgs.push(targetFolder);
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static createSFDXProject(projectName, projectFolder) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:project:create');
        commandArgs.push('-n');
        commandArgs.push(projectName);
        commandArgs.push('-d');
        commandArgs.push(projectFolder);
        commandArgs.push('--manifest');
        commandArgs.push('--template');
        commandArgs.push('empty');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static setDefaultOrg(orgAlias, root) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:config:set');
        commandArgs.push('--json');
        commandArgs.push('defaultusername=' + orgAlias);
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE, cwd: root });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static exportTreeData(query, prefix, outputPath, username) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:data:tree:export');
        if (query) {
            commandArgs.push('-q');
            commandArgs.push(query);
        }
        if (prefix) {
            commandArgs.push('-x');
            commandArgs.push(prefix);
        }
        if (outputPath) {
            commandArgs.push('-d');
            commandArgs.push(outputPath);
        }
        if (username) {
            commandArgs.push('-u');
            commandArgs.push(username);
        }
        commandArgs.push('-p');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static importTreeData(root, username, file) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:data:tree:import');
        if (file) {
            commandArgs.push('-f');
            commandArgs.push(file);
        }
        if (username) {
            commandArgs.push('-u');
            commandArgs.push(username);
        }
        commandArgs.push('--json');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE, cwd: root });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static deleteBatch(root, csvFile, sobject, username) {
        let command;
        let commandArgs = [];
        if (OSUtils.isWindows()) {
            command = 'cmd';
            commandArgs.push('/c');
            commandArgs.push('sfdx');
        } else if (OSUtils.isLinux() || OSUtils.isMac()) {
            command = 'sfdx';
        } else {
            throw new Error('Operative System Not Supported');
        }
        commandArgs.push('force:data:bulk:delete');
        if (file) {
            commandArgs.push('-f');
            commandArgs.push(csvFile);
        }
        if (sobject) {
            commandArgs.push('-s');
            commandArgs.push(sobject);
        }
        if (username) {
            commandArgs.push('-u');
            commandArgs.push(username);
        }
        commandArgs.push('-w');
        commandArgs.push('-1');
        commandArgs.push('--json');
        let process = new Process(command, commandArgs, { maxBuffer: BUFFER_SIZE, cwd: root });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

}
module.exports = ProcessManager;

function runProcess(process, output) {
    let stdOut = [];
    let stdErr = [];
    let excludeError = false;
    return new Promise(function (resolve, rejected) {
        process.run(function (event, data) {
            if (output && data && data.length > 0)
                console.log(data.toString());
            switch (event) {
                case ProcessEvent.STD_OUT:
                    excludeError = false;
                    stdOut = stdOut.concat(data);
                    break;
                case ProcessEvent.ERR_OUT:
                    if (data.toString().indexOf('[EACCES]') !== -1) {
                        excludeError = true;
                    } else if (!excludeError) {
                        stdErr = stdErr.concat(data);
                    }
                    break;
                case ProcessEvent.KILLED:
                    resolve();
                    break;
                case ProcessEvent.END:
                    if (stdErr.length > 0) {
                        rejected(stdErr.toString());
                    } else {
                        resolve(stdOut.toString());
                    }
                    break;
                default:
                    break;
            }
        });
    });
}
