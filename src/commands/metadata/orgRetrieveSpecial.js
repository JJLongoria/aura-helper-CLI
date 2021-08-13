const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const MetadataCommandUtils = require('./utils');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker } = require('@ah/core').FileSystem;
const XMLCompressor = require('@ah/xml-compressor');
const Connection = require('@ah/connector');
const { ProjectUtils } = require('@ah/core').CoreUtils;
const { SpecialMetadata } = require('@ah/core').Values;
const { ProgressStatus } = require('@ah/core').Types;

let retrievedFinished = false;

let argsList = [
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

let sortOrderValues = [
    XMLCompressor.SORT_ORDER.SIMPLE_FIRST,
    XMLCompressor.SORT_ORDER.COMPLEX_FIRST,
    XMLCompressor.SORT_ORDER.ALPHABET_ASC,
    XMLCompressor.SORT_ORDER.ALPHABET_DESC,
]

exports.createCommand = function (program) {
    program
        .command('metadata:org:retrieve:special')
        .description('Command for retrieve the special metadata types stored in your auth org. The special types are all types generated at runtime when retrieving metadata according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Retrieve all supported metadata types (' + Object.keys(SpecialMetadata).join(',') + ')')
        .option('-t, --type <MetadataTypeNames>', 'Retrieve specifics metadata types. You can choose one or a comma separated list of elements. Also you can choose retrieve a specific profile, object o record type. Schema -> "Type1" or "Type1,Type2" or "Type1:Object1, Type1:Object2" or "Type1:Object1:Item1" for example:  "Profile, PermissinSet" for retrieve all profiles and permission sets. "Profile:Admin" for retrieve the admin profile. "RecordType:Account:RecordType1" for  retrieve the RecordType1 for the object Account or "RecordType:Account" for retrieve all Record Types for Account')
        .option('-o, --org-namespace', 'Option for retrieve only the data from your org namespace or retrieve all data')
        .option('-c, --compress', 'Compress the retrieved files.')
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.SORT_ORDER.SIMPLE_FIRST)
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
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    try {
        args.root = PathUtils.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select repair all or repair specific types"));
        return;
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
        return;
    }
    if (args.sortOrder) {
        if (!sortOrderValues.includes(args.sortOrder)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --sort-order value. Please, select any  of this vales: " + sortOrderValues.join(',')));
            return;
        }
    }
    if (args.apiVersion) {
        args.apiVersion = ProjectUtils.getApiAsString(args.apiVersion);
        if (!args.apiVersion) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --api-version selected. Please, select a positive integer or decimal number'));
            return;
        }
    } else {
        let projectConfig = ProjectUtils.getProjectConfig(args.root);
        args.apiVersion = projectConfig.sourceApiVersion;
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    let types;
    if (args.type && !args.all) {
        types = MetadataCommandUtils.getAdvanceTypes(args.type);
    }
    retrieve(args, types).then(function () {
        Output.Printer.printSuccess(Response.success("Retrieve metadata finished successfully"));
    }).catch(function (error) {
        retrievedFinished = true;
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function retrieve(args, types) {
    return new Promise(async function (resolve, reject) {
        try {
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            const username = ProjectUtils.getOrgAlias(args.root);
            const connection = new Connection(username, args.apiVersion, args.root, projectConfig.namespace);
            connection.setMultiThread();
            const retrieveOut = await connection.retrieveOrgSpecialTypes(PathUtils.getAuraHelperCLITempFilesPath(), types, !args.orgNamespace, args.compress, args.sortOrder, (progress) => {
                progress = new ProgressStatus(progress);
                if (progress.isOnOrgLoadingStage()) {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Describing Org Metadata Types', args.progress));
                }
                if (progress.isOnAfterDownloadStage()) {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(progress.percentage, 'MetadataType: ' + progress.entityType, args.progress));
                }
                if (progress.isOnRetrieveStage()) {
                    if (args.progress) {
                        Output.Printer.printProgress(Response.progress(undefined, 'Retriving Metadata Types. This operation can will take several minutes, please wait.', args.progress));
                        reportRetrieveProgress(args, 2500);
                    }
                }
                if (progress.isOnCopyDataStage()) {
                    retrievedFinished = true;
                }
                if (progress.isOnCopyFileStage()) {
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, 'Copying ' + PathUtils.getBasename(progress.data) + ' to ' + progress.data, args.progress));
                }
            });
            resolve(retrieveOut);
        } catch (error) {
            reject(error);
        }
    });
}

function reportRetrieveProgress(args, millis) {
    if (!retrievedFinished) {
        setTimeout(function () {
            if (!retrievedFinished) {
                Output.Printer.printProgress(Response.progress(undefined, '(' + new Date().getTime() + ') Retrieve in progress. Please wait.', args.progress));
                reportRetrieveProgress(args, millis);
            }
        }, millis);
    }
}