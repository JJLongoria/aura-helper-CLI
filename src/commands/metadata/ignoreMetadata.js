const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Languages = require('../../languages');
const Metadata = require('../../metadata');
const Config = require('../../main/config');
const StrUtils = require('../../utils/strUtils');
const FileChecker = FileSystem.FileChecker;
const FileReader = FileSystem.FileReader;
const FileWriter = FileSystem.FileWriter;
const Paths = FileSystem.Paths;
const Color = Output.Color;
const MetadataFactory = Metadata.Factory;
const MetadataConnection = Metadata.Connection;
const MetadataTypeNames = Metadata.MetadataTypes;
const XMLParser = Languages.XMLParser;
const MetadataCompressor = Metadata.MetadataCompressor;

const IGNORE_FILE_NAME = '.ahignore.json';

exports.createCommand = function (program) {
    program
        .command('metadata:local:ignore')
        .description('Command for ignore metadata from your project. Use .ahignore.json file for perform this operation. This command will be delete the ignored metadata from your project folder')
        .option('-r, --root <path/to/project/root>', 'Path to project root', './')
        .option('-a, --all', 'Ignore all metadata types according to the ignore file')
        .option('-t, --type <MetadataTypeNames>', 'Ignore the specified metadata types according to the ignore file. You can select a sigle or a list separated by commas. This options does not take effect if you choose ignore all')
        .option('-i, --ignore-file <path/to/ignore/file>', 'Path to the ignore file. Use this if you not want to use the project root ignore file or have different name')
        .option('-c, --compress', 'Add this option for compress modifieds files for ignore operation.')
        .action(function (args) {
            run(args);
        });
}

function run(args) {
    if (hasEmptyArgs(args)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    if (args.all == undefined && args.type === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select ignore all or ignore specific types"));
        return;
    }
    try {
        args.root = Paths.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
        return;
    }
    if (!args.ignoreFile)
        args.ignoreFile = args.root + '/' + IGNORE_FILE_NAME;
    else {
        try {
            args.ignoreFile = Paths.getAbsolutePath(args.file);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --ignore-file path. Select a valid path'));
            return;
        }
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND + Paths.getAbsolutePath(pathToRoot)));
        return;
    }
    if (!FileChecker.isExists(args.ignoreFile)) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, args.ignoreFile + " file not found. Check if file exists or have access permission"));
        return;
    }
    getMetadataFromProject(args).then(function (result) {
        let types;
        if (args.all) {
            types = Object.keys(result.metadataFromFileSystem);
        } else if (args.type) {
            types = [type];
            if (type.indexOf(' ') !== -1)
                types = type.split(' ');

        }
        ignoreMetadata(args, types, result.folderMetadataMap, result.metadataFromFileSystem).then(function (typesProcessed) {
            Output.Printer.printSuccess(Response.success("Ignore metadata finished successfully", typesProcessed));
        }).catch(function (error) {
            Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
        });
    }).catch(function (error) {
        Output.Printer.printError(Response.error(ErrorCodes.METADATA_ERROR, error));
    });
}

function hasEmptyArgs(args) {
    return args.all === undefined && args.type === undefined && args.root === undefined && args.ignoreFile === undefined && args.compress === undefined;
}

function getMetadataFromProject(args) {
    return new Promise(async function (resolve, reject) {
        try {
            let username = await Config.getAuthUsername(args.root);
            let metadataTypes = await MetadataConnection.getMetadataTypesFromOrg(username, args.root, { forceDownload: false });
            let folderMetadataMap = MetadataFactory.createFolderMetadataMap(metadataTypes);
            let metadataFromFileSystem = MetadataFactory.getMetadataObjectsFromFileSystem(folderMetadataMap, args.root);
            resolve({ folderMetadataMap: folderMetadataMap, metadataFromFileSystem: metadataFromFileSystem });
        } catch (error) {
            reject(error);
        }
    });
}

function ignoreMetadata(args, typesForIgnore, folderMetadataMap, metadataFromFileSystem) {
    return new Promise(function (resolve, reject) {
        try {
            let typesProcessed = {};
            let ignoredMetadata = JSON.parse(FileReader.readFileSync(args.ignoreFile));
            Object.keys(folderMetadataMap).forEach(function (folder) {
                let metadataType = folderMetadataMap[folder];
                if (ignoredMetadata[metadataType.xmlName]) {
                    if (metadataType.xmlName === MetadataTypeNames.CUSTOM_LABELS && !typesProcessed[MetadataTypeNames.CUSTOM_LABELS]) {
                        let ignoredLabels = ignoreCustomLabels(args, ignoredMetadata[MetadataTypeNames.CUSTOM_LABELS], metadataFromFileSystem);
                        typesProcessed[MetadataTypeNames.CUSTOM_LABELS] = ignoredLabels;
                    }
                }
                resolve(typesProcessed);
            });
        } catch (error) {
            reject(error);
        }
    });
}

function ignoreCustomLabels(args, ignoredLabels, metadataFromFileSystem) {
    if (ignoredLabels.includes('*')) {
        let labels = metadataFromFileSystem[MetadataTypeNames.CUSTOM_LABEL].childs;
        let path = metadataFromFileSystem[MetadataTypeNames.CUSTOM_LABELS].path;
        FileWriter.delete(path);
        return { total: Object.keys(labels).length, ignored: Object.keys(labels) };
    }
    else {
        let removedLabels = [];
        let path = metadataFromFileSystem[MetadataTypeNames.CUSTOM_LABELS].path + '/CustomLabels.labels-meta.xml';
        let xmlRoot = XMLParser.parseXML(FileReader.readFileSync(path), false);
        xmlRoot = XMLParser.fixObjValues(xmlRoot);
        let labels = [];
        for (const label of xmlRoot.CustomLabels.labels) {
            if (ignoredLabels.includes(label.fullName)) {
                removedLabels.push(label.fullName);
            } else {
                labels.push(label);
            }
        }
        xmlRoot.CustomLabels.labels = labels;
        let content;
        if (args.compress) {
            content = MetadataCompressor.compressAsJSON(xmlRoot);
            if (!content)
                content = XMLParser.toXML(xmlRoot);
        } else {
            content = XMLParser.toXML(xmlRoot);
        }
        FileWriter.createFileSync(path, content);
        return { total: removedLabels.length, ignored: removedLabels };
    }
}

