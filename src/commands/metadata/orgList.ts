import { CoreUtils, PathUtils, FileChecker, FileWriter } from "@aurahelper/core";
import { Connection } from "@aurahelper/connector";
import { CommandUtils } from '../utils';
import { Printer } from '../../output';
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from '../response';
import { Errors } from '../errors';
const ProjectUtils = CoreUtils.ProjectUtils;
const Validator = CoreUtils.Validator;

const argsList: string[] = [
    "root",
    "outputFile",
    "apiVersion",
    "progress",
    "beautify"
];

export function createCommand(program: any) {
    program
        .command('metadata:org:list')
        .description('Command for list all metadata from the auth org')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('--output-file <path/to/output/file>', 'Path to file for redirect the output')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args: any) {
            run(args);
        });
}

async function run(args: any) {
    try {
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
        if (args.outputFile) {
            try {
                args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
            } catch (error) {
                Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --output-file path. Select a valid path'));
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
        listOrgMetadata(args).then(function (result) {
            if (args.outputFile) {
                args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
                let baseDir = PathUtils.getDirname(args.outputFile);
                if (!FileChecker.isExists(baseDir)) {
                    FileWriter.createFolderSync(baseDir);
                }
                FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
                Printer.printSuccess(new ResponseBuilder('Output saved in: ' + args.outputFile));
            } else {
                Printer.printSuccess(new ResponseBuilder('List Metadata Types finished successfully').data(result));
            }
        }).catch(function (error) {
            Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
        });
    } catch (error) {
        Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error as Error));
    }

}

function listOrgMetadata(args: any) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress){
                Printer.printProgress(new ProgressBuilder(args.progress).message('Getting All Available Metadata Types'));}
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new Connection(username, args.apiVersion, args.root, undefined);
            const metadataDetails = await connection.listMetadataTypes();
            resolve(metadataDetails);
        } catch (error) {
            reject(error);
        }
    });
}