const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Config = require('../../main/config');
const Metadata = require('../../metadata');
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;
const FileWriter = FileSystem.FileWriter;
const MetadataFactory = Metadata.Factory;
const MetadataConnection = Metadata.Connection;

exports.createCommand = function (program) {
    program
        .command('metadata:local:list')
        .description('Command for list all metadata from the local project')
        .option('-r, --root <path/to/project/root>', 'Path to project root', './')
        .option('-s, --send-to <path/to/output/file>', 'Path to file for redirect the output')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
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
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
        return;
    }
    listLocalMetadata(args).then(function (result) {
        if (args.sendTo) {
            args.sendTo = Paths.getAbsolutePath(args.sendTo);
            let baseDir = Paths.getFolderPath(args.sendTo);
            if (!FileChecker.isExists(baseDir))
                FileWriter.createFolderSync(baseDir);
            FileWriter.createFileSync(args.sendTo, JSON.stringify(result, null, 2));
        } else {
            Output.Printer.printSuccess(Response.success("List Metadata Types finished successfully", result));
        }
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function hasEmptyArgs(args) {
    return args.root === undefined && args.sendTo === undefined;
}

function listLocalMetadata(args) {
    return new Promise(async function (resolve, reject) {
        try {
            let metadata = [];
            let username = await Config.getAuthUsername(args.root);
            let metadataTypes = await MetadataConnection.getMetadataTypes(username, args.root, { forceDownload: false });
            let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
            let metadataFromFileSystem = MetadataFactory.getMetadataObjectsFromFileSystem(folderMetadataMap, args.root);
            Object.keys(folderMetadataMap).forEach(function (folder) {
                let metadataType = folderMetadataMap[folder];
                if (metadataFromFileSystem[metadataType.xmlName])
                    metadata.push(metadataType);
            });
            resolve(metadata);
        } catch (error) {
            reject(error);
        }
    });
}