const Process = require('./process');
const fileSystem = require('../fileSystem');
const Paths = fileSystem.Paths;
const ProcessEvent = require('./processEvent');

const BUFFER_SIZE = 1024 * 500000;

class ProcessManager {

    static listAuthOurgs() {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:auth:list', '--json'], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static listMetadataTypes(user) {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:mdapi:describemetadata', '--json', '-u', user], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static describeSchemaMetadata(user, metadataType) {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:schema:sobject:describe', '--json', '-u', user, '-s', metadataType], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static mdApiDescribeMetadata(user, metadata, folderName) {
        let process;
        if (folderName)
            process = new Process('cmd', ['/c', 'sfdx', 'force:mdapi:listmetadata', '--json', '-u', user, '-m', metadata, '--folder', folderName], { maxBuffer: BUFFER_SIZE });
        else
            process = new Process('cmd', ['/c', 'sfdx', 'force:mdapi:listmetadata', '--json', '-u', user, '-m', metadata], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static describeMetadata(user, metadata, folderName) {
        let process;
        if (folderName)
            process = new Process('cmd', ['/c', 'sfdx', 'force:mdapi:listmetadata', '--json', '-u', user, '-m', metadata, '--folder', folderName], { maxBuffer: BUFFER_SIZE });
        else
            process = new Process('cmd', ['/c', 'sfdx', 'force:mdapi:listmetadata', '--json', '-u', user, '-m', metadata], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static retrieve(user, packageFolder, packageFile) {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:mdapi:retrieve', '--json', '-u', user, '-s', '-r', '' + packageFolder + '', '-k', '' + packageFile + ''], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static retrieveSFDX(user, packageFile, projectFolder) {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:source:retrieve', '--json', '-u', user, '-x', '' + packageFile + ''], { maxBuffer: BUFFER_SIZE, cwd: projectFolder });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }


    static destructiveChanges(user, destructiveFolder) {
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
        let process = new Process('cmd', ['/c', 'sfdx', 'force:mdapi:deploy:report', '--json', '-u', user, '-i', jobId], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static cancelDeploy(user, jobId) {
        let process = new Process('cmd', ['/c', 'sfdx', 'mdapi:deploy:cancel', '--json', '-u', user, '-i', jobId], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static query(user, query) {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:data:soql:query', '--json', '-u', user, '-q', query], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static queryToolingAPI(user, query) {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:data:soql:query', '--json', '-u', user, '-q', query, '-t'], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static gitLog() {
        let process = new Process('cmd', ['/c', 'git', 'log', '--pretty=medium'], { maxBuffer: BUFFER_SIZE, cwd: Paths.getWorkspaceFolder() });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static gitGetBranches() {
        let process = new Process('cmd', ['/c', 'git', 'branch', '-a'], { maxBuffer: BUFFER_SIZE, cwd: Paths.getWorkspaceFolder() });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static gitDiff(projectRoot, source, target) {
        let process;
        if (target)
            process = new Process('cmd', ['/c', 'git', 'diff', source, target], { maxBuffer: BUFFER_SIZE, cwd: projectRoot });
        else
            process = new Process('cmd', ['/c', 'git', 'diff', source], { maxBuffer: BUFFER_SIZE, cwd: projectRoot });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static gitFetch() {
        let process = new Process('cmd', ['/c', 'git', 'fetch'], { maxBuffer: BUFFER_SIZE, cwd: Paths.getWorkspaceFolder() });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static convertToSFDX(packageFolder, packageFile, targetFolder) {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:mdapi:convert', '-r', '' + packageFolder + '', '--manifest', '' + packageFile + '', '-d', '' + targetFolder + ''], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static createSFDXProject(projectName, projectFolder) {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:project:create', '-n', projectName, '-d', '' + projectFolder + '', '--manifest', '--template', 'empty'], { maxBuffer: BUFFER_SIZE });
        return new Promise(function (resolve) {
            runProcess(process).then(function (stdOut) {
                resolve({ stdOut: stdOut, stdErr: undefined });
            }).catch(function (stdErr) {
                resolve({ stdOut: undefined, stdErr: stdErr });
            });
        });
    }

    static setDefaultOrg(orgAlias, cwd) {
        let process = new Process('cmd', ['/c', 'sfdx', 'force:config:set', '--json', 'defaultusername=' + orgAlias], { maxBuffer: BUFFER_SIZE, cwd: cwd });
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

function runProcess(process) {
    let stdOut = [];
    let stdErr = [];
    return new Promise(function (resolve, rejected) {
        process.run(function (event, data) {
            switch (event) {
                case ProcessEvent.STD_OUT:
                    stdOut = stdOut.concat(data);
                    break;
                case ProcessEvent.ERR_OUT:
                    stdErr = stdErr.concat(data);
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
