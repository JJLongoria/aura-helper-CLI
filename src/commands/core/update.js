const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const Config = require('../../main/config');
const FileSystem = require('../../fileSystem');
const StrUtils = require('../../utils/strUtils');
const ProcessManager = require('../../processes/processManager');
const Paths = FileSystem.Paths;

exports.createCommand = function (program) {
    program
        .command('update')
        .description('Command for update Aura Helper CLI to the latest version')
        .action(function (args) {
            run(args);
        });
}

function run() {
    let appPaths = Paths.getAppPath();
    let runNpm = false;
    if (appPaths.length > 0) {
        for (const appPath of appPaths) {
            let tmp = StrUtils.replace(appPath, '\\', '/');
            if (tmp.indexOf('/npm/') !== -1) {
                runNpm = true;
                break;
            }
        }
    }
    if (runNpm) {
        updateNPM().then(function(result){
            Output.Printer.printSuccess(Response.success(result));
        }).catch(function(error){
            Output.Printer.printError(Response.error(ErrorCodes.UNKNOWN_ERROR, error));
        });
    } else {
        update(appPaths[0]);
    }
}

function updateNPM() {
    return new Promise(async function (resolve, reject) {
        try{
            let out = await ProcessManager.updateNPM(true);
            if(!out || (out && out.stdOut))
                resolve('Aura Helper Updated Succesfully');
            else if(out.stdErr)
                reject(out.stdErr);
        } catch(error){
            reject(error)
        } 
    });
}

function update(appPath) {

}