const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const FileSystem = require('../../fileSystem');
const Metadata = require('../../metadata');
const Utils = require('./utils');
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
        .option('-p, --progress [format]', 'Option for report the command progress. Available formats: ' + Utils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

function run(args) {
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
    if (args.all == undefined && args.directory === undefined && args.file === undefined) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "You must select compress all, entire directory or single file"));
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
    if (args.all || args.directory) {
        let param = (args.all) ? '--root' : '--directory';
        let path = (args.all) ? args.root : args.directory;
        try {
            path = Paths.getAbsolutePath(path);
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong ' + param + ' path. Select a valid path'));
            return;
        }
        compressDirectory(path, args.progress).then(function () {
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
        compressFile(args.file, args.progress).then(function () {
            Output.Printer.printSuccess(Response.success('Compress XML files finish successfully'));
        }).catch(function (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, error));
        });
    }
}

function hasEmptyArgs(args) {
    return args.all === undefined && args.directory === undefined && args.file === undefined && args.root === undefined;
}

function compressDirectory(directory, progress) {
    return new Promise(function (resolve, reject) {
        FileReader.getAllFiles(directory).then(function (files) {
            try {
                let xmlFiles = [];
                for (const filePath of files) {
                    if (filePath.endsWith('.xml')) {
                        xmlFiles.push(filePath);
                    }
                }
                let filesToProcess = xmlFiles.length;
                for (const filePath of xmlFiles) {
                    compressFile(filePath, progress).then(function () {
                        filesToProcess--;
                        if (filesToProcess === 0)
                            resolve();
                    }).catch(function (error) {
                        if (progress)
                            Output.Printer.printProgress(Response.progress(undefined, 'The  file ' + filePath + ' does not support XML compression', progress));
                        filesToProcess--;
                    });
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

function compressFile(file, progress) {
    return new Promise(function (resolve, reject) {
        try {
            let content = MetadataCompressor.compress(file);
            if (content) {
                if (progress)
                    Output.Printer.printProgress(Response.progress(undefined, 'Compresing ' + file + ' XML file', progress));
                FileWriter.createFile(file, content, function () {
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

