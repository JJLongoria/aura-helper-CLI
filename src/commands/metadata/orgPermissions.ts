import { CoreUtils, PathUtils, FileChecker } from "@aurahelper/core";
import { SFConnector } from '@aurahelper/connector';
import { CommandUtils } from '../utils';
import { Printer } from '../../output';
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from '../response';
import { Errors } from '../errors';
const ProjectUtils = CoreUtils.ProjectUtils;
const Validator = CoreUtils.Validator;

const argsList: string[] = [
    "root",
    "apiVersion",
    "progress",
    "compress"
];

let retrievedFinished = false;

export function createCommand(program: any) {
    program
        .command('metadata:org:permissions')
        .description('Command to get all User Permissions available in the auth org.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args: any) {
            run(args);
        });
}

function run(args: any) {
    retrievedFinished = false;
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
    loadPermissions(args).then(function (result) {
        Printer.printSuccess(new ResponseBuilder('Available User permissions loaded succesfully').data(result));
    }).catch(function (error) {
        Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
    });
}

function loadPermissions(args: any) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Loading user permissions started'));
                reportRetrieveProgress(args, 2500);
            }
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new SFConnector(username, args.apiVersion, args.root, projectConfig!.namespace);
            connection.loadUserPermissions(PathUtils.getAuraHelperCLITempFilesPath()).then((permissions) => {
                retrievedFinished = true;
                resolve(permissions);
            }).catch((error) => {
                retrievedFinished = true;
                reject(error);
            });
        } catch (error) {
            retrievedFinished = true;
            reject(error);
        }
    });
}

function reportRetrieveProgress(args: any, millis: number) {
    if (!retrievedFinished) {
        setTimeout(function () {
            if (!retrievedFinished) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('(' + new Date().getTime() + ') Loading Permissions in progress. Please wait'));
                reportRetrieveProgress(args, millis);
            }
        }, millis);
    }
}