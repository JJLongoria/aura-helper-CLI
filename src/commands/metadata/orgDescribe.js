const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Config = require('../../main/config');
const Metadata = require('../../metadata');
const Utils = require('./utils');
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;
const FileWriter = FileSystem.FileWriter;
const MetadataConnection = Metadata.Connection;

exports.createCommand = function (program) {
    program
        .command('metadata:org:describe')
        .description('Command for describe the metadata types from the auth org')
        .option('-r, --root <path/to/project/root>', 'Path to project root', './')
        .option('-a, --all', 'Describe all metadata types')
        .option('-o, --org-namespace', 'Describe only metadatatypes for your org namespace')
        .option('-t, --type <MetadataTypeNames>', 'Describe the specified metadata types. You can select a single metadata or a list separated by commas. This option does not take effect if you choose describe all')
        .option('-p, --progress [format]', 'Option for report the command progress. Available formats: ' + Utils.getProgressAvailableTypes().join(','))
        .option('-s, --send-to <path/to/output/file>', 'Path to file for redirect the output')
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
    Output.Printer.setColorized(args.beautify);
    if (hasEmptyArgs(args)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    try {
        args.root = Paths.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    if (args.sendTo) {
        try {
            args.sendTo = Paths.getAbsolutePath(args.sendTo);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --send-to path. Select a valid path'));
            return;
        }
    }
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select describe all or describe specific types"));
        return;
    }
    if (args.progress) {
        if (!Utils.getProgressAvailableTypes().includes(args.progress)) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value. Please, select any  of this vales: " + Utils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
        return;
    }
    if (args.progress)
        Output.Printer.printProgress(Response.progress(undefined, 'Gettin All Available Metadata Types', args.progress));
    let username = await Config.getAuthUsername(args.root);
    let types = [];
    if (args.all) {
        types = [];
        let metadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: true });
        for (const type of metadataTypes) {
            types.push(type.xmlName);
        }
    } else if (args.type) {
        types = Utils.getTypes(args.type);
    }
    describeMetadata(args, username, types).then(function (result) {
        if (args.sendTo) {
            args.sendTo = Paths.getAbsolutePath(args.sendTo);
            let baseDir = Paths.getFolderPath(args.sendTo);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.sendTo, JSON.stringify(result, null, 2));
        } else {
            Output.Printer.printSuccess(Response.success("Describe Metadata Types finished successfully", result));
        }
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function hasEmptyArgs(args) {
    return args.root === undefined && args.all === undefined && args.type === undefined && args.progress === undefined && args.orgNamespace === undefined && args.sendTo === undefined;
}

function describeMetadata(args, username, types) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, 'Describing Org Metadata Types', args.progress));
            let projectConfig = Config.getProjectConfig(args.root);
            let options = {
                orgNamespace: projectConfig.namespace,
                downloadAll: !args.orgNamespace,
                progressReport: args.progress
            }
            let metadata = await MetadataConnection.getSpecificMetadataFromOrg(username, types, options, Output);
            resolve(metadata);
        } catch (error) {
            reject(error);
        }
    });
}