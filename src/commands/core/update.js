const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const { PathUtils } = require('@ah/core').FileSystem;
const { StrUtils } = require('@ah/core').CoreUtils;
const { ProcessFactory, ProcessHandler } = require('@ah/core').ProcessManager;

exports.createCommand = function (program) {
    program
        .command('update')
        .description('Command for update Aura Helper CLI to the latest version')
        .action(function (args) {
            run(args);
        });
}

function run() {
    let appPaths = PathUtils.getAuraHelperCLIAppPath();
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
        updateNPM().then(function (result) {
            Output.Printer.printSuccess(new ResponseBuilder(result));
        }).catch(function (error) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
        });
    } else {
        update(appPaths[0]);
    }
}

function updateNPM() {
    return new Promise(async function (resolve, reject) {
        try {
            const process = ProcessFactory.updateNPM(true);
            try {
                await ProcessHandler.runProcess(process);
                resolve('Aura Helper Updated Succesfully');
            } catch (error) {
                reject(error);
            }
        } catch (error) {
            reject(error)
        }
    });
}

function update(appPath) {

}