const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Metadata = require('../../metadata');
const FileChecker = FileSystem.FileChecker;
const FileReader = FileSystem.FileReader;
const FileWriter = FileSystem.FileWriter;
const Paths = FileSystem.Paths;
const Color = Output.Color;
const MetadataCompressor = Metadata.MetadataCompressor;

exports.createCommand = function (program) {
    program
        .command('metadata:local:compress')
        .description('Compress XML Metadata Files for best conflict handling with SVC systems. Works with relative or absolute paths.')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder.', './')
        .option('-a, --all', 'Compress all XML files with support compression in your project.')
        .option('-d, --directory <path/to/directory>', 'Compress XML Files from specific directory. This options does not take effect if you choose compress all.')
        .option('-f, --file <path/to/file>', 'Compress the specified XML file. This options does not take effect if you choose compress directory or all.')
        .action(function (args) {
            run(args);
        });
}

function run(args) {
    if (hasEmptyArgs(args)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    if (args.all == undefined && args.directory === undefined && args.file === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select compress all, entire directory or single file"));
        return;
    }
    if (args.all) {
        try {
            args.root = Paths.getAbsolutePath(args.root);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path. Select a valid path'));
            return;
        }
        if (!FileChecker.isSFDXRootPath(args.root)) {
            Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
            return;
        }
        compressAll(args).then(function () {
            Output.Printer.printSuccess(Response.success('Compress XML files finish successfully'));
        }).catch(function (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, error));
        });
    } else if (args.directory) {
        try {
            args.directory = Paths.getAbsolutePath(args.directory);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --directory path. Select a valid path'));
            return;
        }
        compressDirectory(args).then(function () {
            Output.Printer.printSuccess(Response.success('Compress XML files finish successfully'));
        }).catch(function (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, error));
        });
    } else {
        try {
            args.file = Paths.getAbsolutePath(args.file);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --file path. Select a valid path'));
            return;
        }
        compressFile(args).then(function () {
            Output.Printer.printSuccess(Response.success('Compress XML files finish successfully'));
        }).catch(function (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, error));
        });
    }
}

function hasEmptyArgs(args) {
    return args.all === undefined && args.directory === undefined && args.file === undefined && args.root === undefined;
}

function compressAll(args) {
    return new Promise(function (resolve, reject) {
        FileReader.getAllFiles(args.root).then(function (files) {
            try {
                let xmlFiles = [];
                for (const filePath of files) {
                    if (filePath.endsWith('.xml')) {
                        xmlFiles.push(filePath);
                    }
                }
                let filesToProcess = xmlFiles.length;
                for (const filePath of xmlFiles) {
                    let content = MetadataCompressor.compress(args.root + '/' + filePath);
                    if (content) {
                        FileWriter.createFile(filePath, content, function () {
                            filesToProcess--;
                            if (filesToProcess === 0)
                                resolve();
                        });
                    } else {
                        filesToProcess--;
                    }
                }
                if (filesToProcess === 0)
                    resolve();
            } catch (error) {
                reject(error);
            }
        }).catch(function (error) {
            reject(error);
        });
    });
}

function compressDirectory(args) {
    return new Promise(function (resolve, reject) {
        try {
            let files = FileReader.readDirSync(args.directory);
            let filesToProcess = files.length;
            for (const filePath of files) {
                let content = MetadataCompressor.compress(args.directory + '/' + filePath);
                console.log(content);
                if (content) {
                    FileWriter.createFileSync(args.directory + '/' + filePath, content);
                }
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function compressFile(args) {
    return new Promise(function (resolve, reject) {
        try {
            let content = MetadataCompressor.compress(args.file);
            if (content) {
                FileWriter.createFile(args.file, content, function () {
                    resolve();
                });
            } else {
                reject("The selected file does not support xml compression");
            }
        } catch (error) {
            reject(error);
        }
    });
}

