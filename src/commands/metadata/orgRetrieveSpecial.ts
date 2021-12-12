import { CoreUtils, PathUtils, FileChecker, SpecialMetadata, MetadataType } from "@aurahelper/core";
import { SFConnector } from '@aurahelper/connector';
import { CommandUtils } from '../utils';
import { Printer } from '../../output';
import { ErrorBuilder, ProgressBuilder, ResponseBuilder } from '../response';
import { Errors } from '../errors';
import { XMLCompressor } from '@aurahelper/xml-compressor';
import { MTCommandUtils } from './utils';
const ProjectUtils = CoreUtils.ProjectUtils;
const Validator = CoreUtils.Validator;

let retrievedFinished = false;

const argsList: string[] = [
    "root",
    "all",
    "type",
    "orgNamespace",
    "compress",
    "sortOrder",
    "apiVersion",
    "progress",
    "compress"
];

const sortOrderValues = Object.values(XMLCompressor.getSortOrderValues());

export function createCommand(program: any) {
    program
        .command('metadata:org:retrieve:special')
        .description('Command for retrieve the special metadata types stored in your auth org. The special types are all types generated at runtime when retrieving metadata according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Retrieve all supported metadata types (' + Object.keys(SpecialMetadata).join(',') + ')')
        .option('-t, --type <MetadataTypeNames>', 'Retrieve specifics metadata types. You can choose one or a comma separated list of elements. Also you can choose retrieve a specific profile, object o record type. Schema -> "Type1" or "Type1,Type2" or "Type1:Object1, Type1:Object2" or "Type1:Object1:Item1" for example:  "Profile, PermissionSet" to retrieve all profiles and permission sets. "Profile:Admin" to retrieve the admin profile. "RecordType:Account:RecordType1" to  retrieve the RecordType1 for the object Account or "RecordType:Account" for retrieve all Record Types for Account')
        .option('-o, --org-namespace', 'Option for retrieve only the data from your org namespace or retrieve all data')
        .option('-c, --compress', 'Compress the retrieved files.')
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.getSortOrderValues().SIMPLE_FIRST)
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
    if (args.all === undefined && args.type === undefined) {
        Printer.printError(new ErrorBuilder(Errors.MISSING_ARGUMENTS).message('You must select retrieve all or retrieve specific types'));
        return;
    }
    if (args.sortOrder) {
        if (!sortOrderValues.includes(args.sortOrder)) {
            Printer.printError(new ErrorBuilder(Errors.WRONG_ARGUMENTS).message('Wrong --sort-order value (' + args.sortOrder + '). Please, select any of this values: ' + sortOrderValues.join(',')));
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
    let types;
    if (args.type && !args.all) {
        types = MTCommandUtils.getAdvanceTypes(args.type);
    }
    retrieve(args, types).then(function (retrieveOut) {
        Printer.printSuccess(new ResponseBuilder('Retrieve metadata finished successfully').data(retrieveOut));
    }).catch(function (error) {
        retrievedFinished = true;
        Printer.printError(new ErrorBuilder(Errors.COMMAND_ERROR).exception(error));
    });
}

function retrieve(args: any, types?: { [key: string]: MetadataType }) {
    return new Promise(async function (resolve, reject) {
        try {
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new SFConnector(username, args.apiVersion, args.root, projectConfig!.namespace);
            connection.setMultiThread();
            connection.onLoadingOrg(() => {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Describing Org Metadata Types'));
                }
            });
            connection.onAfterDownloadType((status) => {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('MetadataType: ' + status.entityType).increment(status.increment).percentage(status.percentage));
                }
            });
            connection.onRetrieve(() => {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Retriving Metadata Types. This operation can will take several minutes, please wait.'));
                    reportRetrieveProgress(args, 2500);
                }
            });
            connection.onCopyData(() => {
                retrievedFinished = true;
            });
            connection.onCopyFile((status) => {
                if (args.progress) {
                    Printer.printProgress(new ProgressBuilder(args.progress).message('Copying ' + PathUtils.getBasename(status.data) + ' to ' + status.data));
                }
            });
            const retrieveOut = await connection.retrieveOrgSpecialTypes(PathUtils.getAuraHelperCLITempFilesPath(), types, !args.orgNamespace, args.compress, args.sortOrder);
            resolve(retrieveOut);
        } catch (error) {
            reject(error);
        }
    });
}

function reportRetrieveProgress(args: any, millis: number) {
    if (!retrievedFinished) {
        setTimeout(function () {
            if (!retrievedFinished) {
                Printer.printProgress(new ProgressBuilder(args.progress).message('(' + new Date().getTime() + ') Retrieve in progress. Please wait.'));
                reportRetrieveProgress(args, millis);
            }
        }, millis);
    }
}