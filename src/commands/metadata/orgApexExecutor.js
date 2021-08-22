const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const CommandUtils = require('../utils');
const Connection = require('@ah/connector');
const { PathUtils, FileChecker } = require('@ah/core').FileSystem;
const { ProjectUtils, Validator } = require('@ah/core').CoreUtils;


let argsList = [
    "root",
    "file",
    "iterations",
    "printLog",
    "apiVersion",
    "progress",
    "beautify"
];

exports.createCommand = function (program) {
    program
        .command('metadata:org:apex:executor')
        .description('Command to execute an Anonymous Apex script from file against the auth org.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-f, --file <path/to/apex/script>', 'Path to the Anonymous Apex Script file')
        .option('-l, --print-log', 'Option to print the result log of every execution', false)
        .option('-i, --iterations <number/of/iterations>', 'Option for select the scritp execution number. For example, 3 for execute the script 3 times', 1)
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
    Output.Printer.setColorized(args.beautify);
    if (CommandUtils.hasEmptyArgs(args, argsList)) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    try {
        args.root = Validator.validateFolderPath(args.root);
    } catch (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.FOLDER_ERROR).message('Wrong --root path').exception(error));
        return;
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.PROJECT_NOT_FOUND).message(args.root));
        return;
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --progress value. Please, select any of this vales: ' + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (args.file) {
        try {
            args.file = Validator.validateFilePath(args.file);
        } catch (error) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.FILE_ERROR).message('Wrong --file path').exception(error));
            return;
        }
    } else {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Missing --file path. Apex Script file is required'));
        return;
    }
    if (args.apiVersion) {
        try {
            args.apiVersion = ProjectUtils.getApiAsString(args.apiVersion);
        } catch (error) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --api-version selected').exception(error));
        }
    } else {
        let projectConfig = ProjectUtils.getProjectConfig(args.root);
        args.apiVersion = projectConfig.sourceApiVersion;
    }
    if (args.iterations <= 0) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('Wrong --iterations option. Select a value greater than 0'));
        return;
    }
    executeApex(args).then(function () {
        Output.Printer.printSuccess(new ResponseBuilder("Apex execution finished succesfully"));
    }).catch(function (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
    });
}

function executeApex(args) {
    return new Promise(async function (resolve, reject) {
        try {
            let iterations = args.iterations;
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            const username = ProjectUtils.getOrgAlias(args.root);;
            const connection = new Connection(username, args.apiVersion, args.root, projectConfig.namespace);
            for (let i = 0; i < iterations; i++) {
                if (args.progress) {
                    Output.Printer.printProgress(new ProgressBuilder('plaintext').message('Executing Script. Iteration: ' + (i + 1) + '/' + iterations));
                }
                let result = await connection.executeApexAnonymous(args.file);
                if (args.progress) {
                    Output.Printer.printProgress(new ProgressBuilder('plaintext').message('Iteration: ' + (i + 1) + '/' + iterations + ' finished. '));
                }
                if (args.printLog) {
                    Output.Printer.printProgress(new ProgressBuilder('plaintext').message(result));
                }
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}