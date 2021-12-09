import { CoreUtils, FileChecker } from "@aurahelper/core";
import { Connection } from "@aurahelper/connector";
import { CommandUtils } from '../utils';
import { Printer } from '../../output';
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from '../response';
import { Errors } from '../errors';
const ProjectUtils = CoreUtils.ProjectUtils;
const Validator = CoreUtils.Validator;


const argsList: string[] = [
    "root",
    "file",
    "iterations",
    "printLog",
    "apiVersion",
    "progress",
    "beautify"
];

export function createCommand(program: any) {
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
        .action(function (args: any) {
            run(args);
        });
}

async function run(args: any) {
    Printer.setColorized(args.beautify);
    if (CommandUtils.hasEmptyArgs(args, argsList)) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS));
        return;
    }
    try {
        args.root = Validator.validateFolderPath(args.root);
    } catch (error) {
        Printer.printError(new ErrorBuilder(Errors.FOLDER_ERROR).message('Wrong --root path (' + args.root + ')').exception(error as Error));
        return;
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Printer.printError(new ErrorBuilder(Errors.PROJECT_NOT_FOUND).message(args.root));
        return;
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Printer.printError(new ErrorBuilder(Errors.WRONG_ARGUMENTS).message('Wrong --progress value (' + args.progress + '). Please, select any of this vales: ' + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (args.file) {
        try {
            args.file = Validator.validateFilePath(args.file);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --file path').exception(error as Error));
            return;
        }
    } else {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Missing --file path. Apex Script file is required'));
        return;
    }
    if (args.apiVersion) {
        try {
            args.apiVersion = ProjectUtils.getApiAsString(args.apiVersion);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.WRONG_ARGUMENTS).message('Wrong --api-version selected').exception(error as Error));
        }
    } else {
        let projectConfig = ProjectUtils.getProjectConfig(args.root);
        if (projectConfig) {
            args.apiVersion = projectConfig.sourceApiVersion;
        }
    }
    if (args.iterations <= 0) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --iterations option. Select a value greater than 0'));
        return;
    }
    executeApex(args).then(function () {
        Printer.printSuccess(new ResponseBuilder("Apex execution finished succesfully"));
    }).catch(function (error) {
        Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
    });
}

function executeApex(args: any) {
    return new Promise<void>(async function (resolve, reject) {
        try {
            let iterations = args.iterations;
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            const username = ProjectUtils.getOrgAlias(args.root);;
            const connection = new Connection(username, args.apiVersion, args.root, projectConfig!.namespace);
            for (let i = 0; i < iterations; i++) {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder('plaintext').message('Executing Script. Iteration: ' + (i + 1) + '/' + iterations));
                }
                let result = await connection.executeApexAnonymous(args.file);
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder('plaintext').message('Iteration: ' + (i + 1) + '/' + iterations + ' finished. '));
                }
                if (args.printLog) {
                    Printer.printProgress(new ProgressBuilder('plaintext').message(result));
                }
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}