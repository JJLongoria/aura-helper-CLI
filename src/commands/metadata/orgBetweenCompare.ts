import { MetadataFactory } from '@aurahelper/metadata-factory';
import { CoreUtils, PathUtils, FileChecker, FileWriter } from "@aurahelper/core";
import { SFConnector } from '@aurahelper/connector';
import { CommandUtils } from '../utils';
import { Printer } from '../../output';
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from '../response';
import { Errors } from '../errors';
import { Ignore } from '@aurahelper/ignore';
import { PackageGenerator } from '@aurahelper/package-generator';
import { GitManager } from '@aurahelper/git-manager';
const ProjectUtils = CoreUtils.ProjectUtils;
const Validator = CoreUtils.Validator;
const MetadataUtils = CoreUtils.MetadataUtils;

const argsList: string[] = [
    "root",
    "source",
    "target",
    "outputFile",
    "apiVersion",
    "progress",
    "beautify"
];

export function createCommand(program: any) {
    program
        .command('metadata:org:compare:between')
        .description('Command for compare two organization to get the differences. Return the metadata that exists on target but not exists on source')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-s, --source <sourceUsernameOrAlias>', 'Source Salesforce org to compare. If you want to compare your active org with other, this options is not necessary because use the --root option for get the project\'s auth org. If you choose source, --root will be ignored')
        .option('-t, --target <targetUsernameOrAlias>', 'Target Salesforce org to compare.')
        .option('--output-file <path/to/output/file>', 'Path to file for redirect the output')
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
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Printer.printError(new ErrorBuilder(Errors.WRONG_ARGUMENTS).message('Wrong --progress value (' + args.progress + '). Please, select any of this vales: ' + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (!args.source) {
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
    }
    if (args.outputFile) {
        try {
            args.outputFile = PathUtils.getAbsolutePath(args.outputFile);
        } catch (error) {
            Printer.printError(new ErrorBuilder(Errors.FILE_ERROR).message('Wrong --output-file path').exception(error as Error));
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
    if (!args.target) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('Wrong --target value. You must select a target org to compare'));
        return;
    }
    compareMetadata(args).then((result) => {
        if (args.outputFile) {
            let baseDir = PathUtils.getDirname(args.outputFile);
            if (!FileChecker.isExists(baseDir)) {
                FileWriter.createFolderSync(baseDir);
            }
            FileWriter.createFileSync(args.outputFile, JSON.stringify(result, null, 2));
            Printer.printSuccess(new ResponseBuilder('Output saved in: ' + args.outputFile));
        } else {
            Printer.printSuccess(new ResponseBuilder('Comparing Org with Local finished succesfully').data(result));
        }
    }).catch((error) => {
        Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
    });
}

function compareMetadata(args: any) {
    return new Promise(async (resolve, reject) => {
        try {
            let username = args.source;
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            if (!username) {
                username = ProjectUtils.getOrgAlias(args.root);
            }
            const connectionSource = new SFConnector(username, args.apiVersion, args.root, projectConfig!.namespace);
            const connectionTarget = new SFConnector(args.target, args.apiVersion, args.root, projectConfig!.namespace);
            connectionTarget.setMultiThread();
            connectionSource.setMultiThread();
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Getting Available types on source (' + username + ')'));
            }
            const sourceMetadataDetails = await connectionSource.listMetadataTypes();
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Describe Metadata from source (' + username + ')'));
            }
            connectionSource.onAfterDownloadType((status) => {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('MetadataType: ' + status.entityType).increment(status.increment).percentage(status.percentage));
                }
            });
            const sourceMetadata = await connectionSource.describeMetadataTypes(sourceMetadataDetails, false);
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Getting Available types on target (' + args.target + ')'));
            }
            const targetMetadataDetails = await connectionTarget.listMetadataTypes();
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Describe Metadata from target (' + args.target + ')'));
            }
            connectionTarget.onAfterDownloadType((status) => {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('MetadataType: ' + status.entityType).increment(status.increment).percentage(status.percentage));
                }
            });
            const targetMetadata = await connectionTarget.describeMetadataTypes(targetMetadataDetails, false);
            if (args.progress) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('Comparing Metadata Types'));
            }
            const compareResult = MetadataUtils.compareMetadata(sourceMetadata, targetMetadata);
            resolve(compareResult);
        } catch (error) {
            reject(error);
        }
    });
}