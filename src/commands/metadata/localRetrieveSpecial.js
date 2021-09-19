const Output = require('../../output');
const { ResponseBuilder, ProgressBuilder, ErrorBuilder } = require('../response');
const ErrorCodes = require('../errors');
const MetadataCommandUtils = require('./utils');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker } = require('@aurahelper/core').FileSystem;
const XMLCompressor = require('@aurahelper/xml-compressor');
const Connection = require('@aurahelper/connector');
const { ProjectUtils, Validator } = require('@aurahelper/core').CoreUtils;
const { SpecialMetadata } = require('@aurahelper/core').Values;

const PROJECT_NAME = 'TempProject';

const SUBFOLDER_BY_METADATA_TYPE = {
    RecordType: 'recordTypes'
}

let retrievedFinished = false;

let argsList = [
    "root",
    "all",
    "type",
    "includeOrg",
    "orgNamespace",
    "compress",
    "sortOrder",
    "apiVersion",
    "progress",
    "beautify"
];

const sortOrderValues = Object.values(XMLCompressor.getSortOrderValues());

exports.createCommand = function (program) {
    program
        .command('metadata:local:retrieve:special')
        .description('Command for retrieve the special metadata types stored in your local project. The special types are the types generated at runtime when retrieving data from org according the package data. Files like permission sets, profiles or translations. For example, with this command you can retrieve all permissions from a profile without retrieve anything more. Also you can retrieve only the Custom Object XML Files without retrieve anything more.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-a, --all', 'Retrieve all supported metadata types (' + Object.keys(SpecialMetadata).join(',') + ')')
        .option('-t, --type <MetadataTypeNames>', 'Retrieve specifics metadata types. You can choose one or a comma separated list of elements. Also you can choose retrieve a specific profile, object o record type. Schema -> "Type1" or "Type1,Type2" or "Type1:Object1, Type1:Object2" or "Type1:Object1:Item1" for example:  "Profile, PermissinSet" to retrieve all profiles and permission sets. "Profile:Admin" to retrieve the admin profile. "RecordType:Account:RecordType1" to retrieve the RecordType1 for the object Account or "RecordType:Account" to retrieve all Record Types for Account')
        .option('-i, --include-org', 'With this option, you can retrieve the data from org and not only for local, but only retrieve the types that you have in your local.')
        .option('-o, --org-namespace', 'If you choose include data from org, also you can choose if include all data from the org, or only the data from your org namespace')
        .option('-c, --compress', 'Compress the retrieved files.')
        .option('-s, --sort-order <sortOrder>', 'Sort order for the XML elements when compress XML files. By default, the elements are sorted with simple XML elements first. Values: ' + sortOrderValues.join(','), XMLCompressor.getSortOrderValues().SIMPLE_FIRST)
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
    retrievedFinished = false;
    Output.Printer.setColorized(args.beautify);
    if (CommandUtils.hasEmptyArgs(args, argsList)) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    try {
        args.root = Validator.validateFolderPath(args.root);
    } catch (error) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.FOLDER_ERROR).message('Wrong --root path (' + args.root + ')').exception(error));
        return;
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.PROJECT_NOT_FOUND).message(args.root));
        return;
    }
    if (args.progress) {
        if (!CommandUtils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --progress value (' + args.progress + '). Please, select any of this vales: ' + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.MISSING_ARGUMENTS).message('You must select retrieve all or retrieve specific types'));
        return;
    }
    if (args.sortOrder) {
        if (!sortOrderValues.includes(args.sortOrder)) {
            Output.Printer.printError(new ErrorBuilder(ErrorCodes.WRONG_ARGUMENTS).message('Wrong --sort-order value (' + args.sortOrder + '). Please, select any of this values: ' + sortOrderValues.join(',')));
            return;
        }
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
    let types;
    if (args.type && !args.all) {
        types = MetadataCommandUtils.getAdvanceTypes(args.type);
    }
    retrieve(args, types).then(function (retrieveOut) {
        Output.Printer.printSuccess(new ResponseBuilder('Retrieve metadata finished successfully').data(retrieveOut));
    }).catch(function (error) {
        retrievedFinished = true;
        Output.Printer.printError(new ErrorBuilder(ErrorCodes.COMMAND_ERROR).exception(error));
    });
}

function retrieve(args, types) {
    return new Promise(async function (resolve, reject) {
        try {
            const projectConfig = ProjectUtils.getProjectConfig(args.root);
            const username = ProjectUtils.getOrgAlias(args.root);;
            const connection = new Connection(username, args.apiVersion, args.root, projectConfig.namespace);
            connection.setMultiThread();
            let retrieveOut;
            connection.onLoadingLocal(() => {
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Describing Local Metadata Types'));
            });
            connection.onLoadingOrg(() => {
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Describing Org Metadata Types'));
            });
            connection.onAfterDownloadType((status) => {
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('MetadataType: ' + status.entityType).increment(status.increment).percentage(status.percentage));
            });
            connection.onRetrieve(() => {
                if (args.progress) {
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Retriving Metadata Types. This operation can will take several minutes, please wait.'));
                    reportRetrieveProgress(args, 2500);
                }
            });
            connection.onCopyData(() => {
                retrievedFinished = true;
            });
            connection.onCopyFile((status) => {
                if (args.progress)
                    Output.Printer.printProgress(new ProgressBuilder(args.progress).message('Copying ' + PathUtils.getBasename(status.data) + ' to ' + status.data));
            });
            if (!args.includeOrg)
                retrieveOut = await connection.retrieveLocalSpecialTypes(PathUtils.getAuraHelperCLITempFilesPath(), types, args.compress, args.sortOrder);
            else
                retrieveOut = await connection.retrieveMixedSpecialTypes(PathUtils.getAuraHelperCLITempFilesPath(), types, !args.orgNamespace, args.compress, args.sortOrder);
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
                Output.Printer.printProgress(new ProgressBuilder(args.progress).message('(' + new Date().getTime() + ') Retrieve in progress. Please wait.'));
                reportRetrieveProgress(args, millis);
            }
        }, millis);
    }
}