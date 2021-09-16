const Output = require('../../output');
const Response = require('../response');
const ErrorCodes = require('../errors');
const CommandUtils = require('../utils');
const { PathUtils, FileChecker, FileReader, FileWriter } = require('@ah/core').FileSystem;
const { MathUtils, ProjectUtils } = require('@ah/core').CoreUtils;
const Connection = require('@ah/connector');

let argsList = [
    "root",
    "file",
    "query",
    "recordsNumber",
    "sourceOrg",
    "apiVersion",
    "progress",
    "beautify"
];

let extractingFinished = false;
let deletingFinished = false;
let refsByObjectType = {};
let recordTypeByObject = {};
let objectsHierarchyByType = {};
let savedIdsByReference = {};
let totalBatches = 0;
let username;

exports.createCommand = function (program) {
    program
        .command('data:import')
        .description('Command for import the data extracted with data:export command into the selected org')
        .option('-r, --root <path/to/project/root>', 'Path to project root. By default is your current folder', './')
        .option('-f, --file <path/to/exported/file>', 'Path to the exported file with data:export command for import into the auth org')
        .option('-n, --records-number <recordsPerBatch>', 'Number of records to insert at one time. Limit are 200 records. (200 by default)', "200")
        .option('-s, --source-org <username/or/alias>', 'Username or Alias to the source org for import data from the org, not from a file')
        .option('-q, --query <query>', 'Query for extract data. You can use a simple query (Select [fields] from [object] [where] ...) or a complex query (select [fields], [query], [query] from [object] [where] ...) for export data in tree format')
        .option('-v, --api-version <apiVersion>', 'Option for use another Salesforce API version. By default, Aura Helper CLI get the sourceApiVersion value from the sfdx-project.json file')
        .option('-p, --progress <format>', 'Option for report the command progress. Available formats: ' + CommandUtils.getProgressAvailableTypes().join(','))
        .option('-b, --beautify', 'Option for draw the output with colors. Green for Successfull, Blue for progress, Yellow for Warnings and Red for Errors. Only recomended for work with terminals (CMD, Bash, Power Shell...)')
        .action(function (args) {
            run(args);
        });
}

async function run(args) {
    extractingFinished = false;
    Output.Printer.setColorized(args.beautify);
    if (CommandUtils.hasEmptyArgs(args, argsList)) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS));
        return;
    }
    if (args.sourceOrg && !args.query) {
        Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --query. Query are required for extract data from --source-org"));
        return;
    }
    try {
        args.root = PathUtils.getAbsolutePath(args.root);
    } catch (error) {
        Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --root path (' + args.root + '). Select a valid path'));
        return;
    }
    if (args.recordsNumber) {
        try {
            let integerValue = parseInt(args.recordsNumber);
            if (integerValue < 1 || integerValue > 200) {
                Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --records-number selected. Please, select an integer number between 1 and 200'));
                return;
            }
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --records-number selected. Please, select an integer number between 1 and 200'));
            return;
        }
    }
    if (!args.sourceOrg) {
        try {
            args.file = PathUtils.getAbsolutePath(args.file);
            if (!args.file.endsWith('-plan.json')) {
                Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --file path. Please, select a plan file (File ended with -plan.json)'));
                return;
            } else if (!FileChecker.isExists(args.file)) {
                Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --file path. The selected plan file not exists or do not has permissions to access.'));
                return;
            }
        } catch (error) {
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, 'Wrong --file path. Select a valid path'));
            return;
        }
    } else {
        if (!args.query) {
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, 'Wrong --query. If you select a source org, you must include a query for export data'));
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
            Output.Printer.printError(Response.error(ErrorCodes.MISSING_ARGUMENTS, "Wrong --progress value (' + args.progress + '). Please, select any of this vales: " + CommandUtils.getProgressAvailableTypes().join(',')));
            return;
        }
    }
    if (!FileChecker.isSFDXRootPath(args.root)) {
        Output.Printer.printError(Response.error(ErrorCodes.PROJECT_NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND.message + args.root));
        return;
    }
    username = ProjectUtils.getOrgAlias(args.root);
    cleanWorkspace(PathUtils.getAuraHelperCLITempFilesPath() + '/import-export');
    if (args.sourceOrg) {
        let planFile = await startExtractingData(args);
        args.file = planFile;
    }
    isCorrectPlan(args.file).then(function (planData) {
        startImportingData(args, planData).then(function (insertErrorsByBatch) {
            if (Object.keys(insertErrorsByBatch).length > 0) {
                let folder = PathUtils.getDirname(args.file) + '/errors';
                if (FileChecker.isExists(folder))
                    FileWriter.delete(folder);
                FileWriter.createFolderSync(folder);
                Object.keys(insertErrorsByBatch).forEach(function (batchName) {
                    FileWriter.createFileSync(folder + '/' + batchName + '_errors.json', JSON.stringify(insertErrorsByBatch[batchName], null, 2));
                });
                Output.Printer.printSuccess(Response.success("Data does not import because found errors. Go to " + folder + " for see the errors by batch"));
            }
            else
                Output.Printer.printSuccess(Response.success("Data imported succesfully into your Auth Org"));
        }).catch(function (error) {
            Output.Printer.printError(Response.error(ErrorCodes.DATA_ERROR, error));
        });
    }).catch(function (result) {
        if (Array.isArray(result))
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, "The next files does not exists or do not has access permission: " + result.join(", ")));
        else
            Output.Printer.printError(Response.error(ErrorCodes.FILE_ERROR, result));
    });

}

function startImportingData(args, planData) {
    return new Promise(async function (resolve, reject) {
        let tempFolder = PathUtils.getAuraHelperCLITempFilesPath() + '/import-export';
        try {
            let planFolder = PathUtils.getDirname(args.file);
            await loadStoredRecordTypes(args);
            createReferencesMap(args, planData, planFolder);
            resolveRecordTypeReferences(args, planData, planFolder);
            createRecordsHierarchy(args, planData, planFolder);
            createBatches(args, planData);
            let insertErrorsByBatch = await insertBatches(args, planData);
            if (Object.keys(insertErrorsByBatch).length > 0) {
                await cleanInsertedRecords(args, tempFolder);
            }
            resolve(insertErrorsByBatch);
            //cleanWorkspace(tempFolder);
        } catch (error) {
            reject(error)
        }
    });
}

function startExtractingData(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress) {
                Output.Printer.printProgress(Response.progress(undefined, undefined, 'Start Extracting data from Org with username or alias ' + args.sourceOrg, args.progress));
                reportExtractingProgress(args, 1000);
            }
            const connection = new Connection(args.sourceOrg, args.apiVersion, args.root, undefined);
            const response = await connection.exportTreeData(args.query, args.outputPath, args.prefix);
            resolve(response);
        } catch (error) {
            reject(error);
        }
    });
}

function formatBatchCounter(counter) {
    if (counter < 10) {
        return '0000' + counter;
    } else if (counter < 100) {
        return '000' + counter;
    } else if (counter < 1000) {
        return '00' + counter;
    } else if (counter < 10000) {
        return '0' + counter;
    } else {
        return counter;
    }
}

function cleanWorkspace(tempFolder) {
    if (FileChecker.isExists(tempFolder))
        FileWriter.delete(tempFolder);
    FileWriter.createFolderSync(tempFolder);
}

function cleanInsertedRecords(args, tempFolder, callback) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, undefined, 'Errors found on import, rolling back', args.progress));
            let idsByType = {};
            Object.keys(savedIdsByReference).forEach(function (reference) {
                let refData = savedIdsByReference[reference];
                if (!idsByType[refData.sobject]) {
                    idsByType[refData.sobject] = [];
                }
                idsByType[refData.sobject].push(refData.id);
            });
            for (let sobject of Object.keys(idsByType)) {
                deletingFinished = false;
                if (args.progress) {
                    Output.Printer.printProgress(Response.progress(undefined, undefined, 'Rolling back ' + sobject + ' record(s)', args.progress));
                    reportDeletingProgress(args, 1000);
                }
                let csvContent = 'Id\n' + idsByType[sobject].join('\n');
                let csvFile = sobject + '_deleteFile.csv';
                FileWriter.createFileSync(tempFolder + '/' + csvFile, csvContent);
                const connection = new Connection(username, args.apiVersion, args.root, undefined);
                try {
                    const response = await connection.bulkDelete(csvFile, sobject);
                    if (args.progress)
                        Output.Printer.printProgress(Response.progress(undefined, undefined, 'Roll back on ' + sobject + ' record(s) finished succesfully', args.progress));
                } catch (error) {
                    deletingFinished = true;
                    reject(error);
                    return;
                }
                deletingFinished = true;
            }
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function createReferencesMap(args, planData, planFolder) {
    if (args.progress)
        Output.Printer.printProgress(Response.progress(undefined, undefined, 'Saving Reference Map', args.progress));
    for (let plan of planData) {
        for (file of plan.files) {
            let filePath = planFolder + "/" + file;
            let fileData = JSON.parse(FileReader.readFileSync(filePath));
            for (let record of fileData.records) {
                if (!refsByObjectType[plan.sobject]) {
                    refsByObjectType[plan.sobject] = {
                        plan: plan,
                        references: [],
                    };
                }
                refsByObjectType[plan.sobject].references.push('@' + record.attributes.referenceId);
            }
            //FileWriter.createFileSync(filePath.replace('.json', '') + "_referencestmp.json", JSON.stringify(refsByObjectType, null, 2));
        }
    }
}

function resolveRecordTypeReferences(args, planData, planFolder) {
    if (args.progress)
        Output.Printer.printProgress(Response.progress(undefined, undefined, 'Resolving Record Types references', args.progress));
    for (let plan of planData) {
        if (args.progress)
            Output.Printer.printProgress(Response.progress(undefined, undefined, 'Resolving Record Type references on ' + plan.sobject + ' records', args.progress));
        for (file of plan.files) {
            let filePath = planFolder + "/" + file;
            let fileData = JSON.parse(FileReader.readFileSync(filePath));
            for (let record of fileData.records) {
                if (record.RecordType) {
                    if (!record.RecordType.DeveloperName)
                        throw new Error("DeveloperName not found on RecordType data. Please, put Recordtype.DeveloperName into the query for correct mapping of record types");
                    if (recordTypeByObject[plan.sobject]) {
                        if (recordTypeByObject[plan.sobject].recordTypes[record.RecordType.DeveloperName]) {
                            record.RecordTypeId = recordTypeByObject[plan.sobject].recordTypes[record.RecordType.DeveloperName].Id;
                            delete record.RecordType;
                        } else {
                            throw new Error("The Record type " + record.RecordType.DeveloperName + " not found on target org. Please, create the record type and then, import the data");
                        }
                    } else {
                        throw new Error("Has no record types for " + plan.sobject + " on target org. Please, create record types and then, import the data");
                    }
                }
            }
            FileWriter.createFileSync(filePath, JSON.stringify(fileData, null, 2));
        }
    }
}

function createRecordsHierarchy(args, planData, planFolder) {
    if (args.progress)
        Output.Printer.printProgress(Response.progress(undefined, undefined, 'Resolving Self references', args.progress));
    for (let plan of planData) {
        for (file of plan.files) {
            let filePath = planFolder + "/" + file;
            let fileData = JSON.parse(FileReader.readFileSync(filePath));
            for (let record of fileData.records) {
                let haveParentId = false;
                let haveMasterId = false;
                if (record.MasterRecordId) {
                    haveMasterId = true;
                    delete record.MasterRecordId;
                }
                Object.keys(record).forEach(function (field) {
                    if (field !== 'attributes') {
                        if (refsByObjectType[plan.sobject]) {
                            if (refsByObjectType[plan.sobject].references.includes(record[field])) {
                                haveParentId = true;
                            }
                        }
                    }
                });
                if (haveParentId) {
                    if (!objectsHierarchyByType[plan.sobject]) {
                        objectsHierarchyByType[plan.sobject] = {
                            masters: [],
                            childs: [],
                        };
                    }
                    objectsHierarchyByType[plan.sobject].childs.push(record);
                } else {
                    if (!objectsHierarchyByType[plan.sobject]) {
                        objectsHierarchyByType[plan.sobject] = {
                            masters: [],
                            childs: [],
                        };
                    }
                    objectsHierarchyByType[plan.sobject].masters.push(record);
                }
            }
            //FileWriter.createFileSync(filePath.replace('.json', '') + "_tmp.json", JSON.stringify(objectsHierarchyByType, null, 2));
        }
    }
}

function createBatches(args, planData) {
    if (args.progress)
        Output.Printer.printProgress(Response.progress(undefined, undefined, 'Creating Batches to insert data', args.progress));
    let batchFolder = PathUtils.getAuraHelperCLITempFilesPath() + '/import-export';
    totalBatches = 0;
    let totalRecords = 0;
    for (let plan of planData) {
        if (objectsHierarchyByType[plan.sobject]) {
            let counter = 1;
            let batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
            let mastersFolder = batchFolder + '/' + plan.sobject + '/masters';
            let childsFolder = batchFolder + '/' + plan.sobject + '/childs';
            let records = [];
            for (let record of objectsHierarchyByType[plan.sobject].masters) {
                totalRecords++;
                if (records.length < args.recordsNumber) {
                    records.push(record);
                } else {
                    totalBatches++;
                    if (!FileChecker.isExists(mastersFolder))
                        FileWriter.createFolderSync(mastersFolder);
                    FileWriter.createFileSync(mastersFolder + '/' + batchFileName, JSON.stringify({ records: records }, null, 2));
                    records = [];
                    counter++;
                    batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
                    records.push(record);
                }
            }
            if (records.length > 0) {
                totalBatches++;
                if (!FileChecker.isExists(mastersFolder))
                    FileWriter.createFolderSync(mastersFolder);
                FileWriter.createFileSync(mastersFolder + '/' + batchFileName, JSON.stringify({ records: records }, null, 2));
                records = [];
                counter++;
                batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
            }
            for (let record of objectsHierarchyByType[plan.sobject].childs) {
                totalRecords++;
                if (records.length < args.recordsNumber) {
                    records.push(record);
                } else {
                    totalBatches++;
                    if (!FileChecker.isExists(childsFolder))
                        FileWriter.createFolderSync(childsFolder);
                    FileWriter.createFileSync(childsFolder + '/' + batchFileName, JSON.stringify({ records: records }, null, 2));
                    records = [];
                    counter++;
                    batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
                    records.push(record);
                }
            }
            if (records.length > 0) {
                totalBatches++;
                if (!FileChecker.isExists(childsFolder))
                    FileWriter.createFolderSync(childsFolder);
                FileWriter.createFileSync(childsFolder + '/' + batchFileName, JSON.stringify({ records: records }, null, 2));
                records = [];
                counter++;
                batchFileName = plan.sobject + '_batch_' + formatBatchCounter(counter) + '.json';
            }
        }
    }
    if (args.progress)
        Output.Printer.printProgress(Response.progress(undefined, undefined, 'Batches to insert data created. Total Records: ' + totalRecords + ' ; Total Batches: ' + totalBatches, args.progress));
}

function insertBatches(args, planData) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, undefined, 'Start job to insert data. This operation can take several minutes. Please wait.', args.progress));
            let batchFolder = PathUtils.getAuraHelperCLITempFilesPath() + '/import-export';
            let increment = MathUtils.round(100 / totalBatches, 2);
            let percentage = 0;
            let insertErrosByBatch = {};
            const connection = new Connection(username, args.apiVersion, batchFolder, undefined);
            for (let plan of planData) {
                let mastersFolder = plan.sobject + '/masters';
                let childsFolder = plan.sobject + '/childs';
                resolveReferences(args, batchFolder + '/' + mastersFolder, batchFolder + '/' + childsFolder);
                if (FileChecker.isExists(batchFolder + '/' + mastersFolder)) {
                    let batchFiles = FileReader.readDirSync(batchFolder + '/' + mastersFolder);
                    if (batchFiles.length > 0) {
                        if (Object.keys(savedIdsByReference).length > 0) {
                            if (args.progress)
                                Output.Printer.printProgress(Response.progress(undefined, undefined, 'Performing insert operation on ' + plan.sobject + ' record(s)', args.progress));
                        }
                        for (let batchFile of batchFiles) {
                            percentage += increment;
                            let batchName = batchFile.replace('.json', '');
                            if (args.progress)
                                Output.Printer.printProgress(Response.progress(increment, percentage, 'Running Batch ' + batchName, args.progress));
                            try {
                                const response = await connection.importTreeData(mastersFolder + '/' + batchFile);
                                if (response.results) {
                                    for (let insertResult of response.results) {
                                        savedIdsByReference[insertResult.refId] = {
                                            id: insertResult.id,
                                            sobject: insertResult.sobject,
                                        };
                                    }
                                } else {
                                    insertErrosByBatch[batchName] = {
                                        name: batchName,
                                        file: batchFolder + '/' + mastersFolder + '/' + batchFile,
                                        errors: response.errors,
                                    };
                                }
                            } catch (error) {
                                reject(error);
                            }
                        }
                    }
                }
                if (FileChecker.isExists(batchFolder + '/' + childsFolder)) {
                    let batchFiles = FileReader.readDirSync(batchFolder + '/' + childsFolder);
                    if (batchFiles.length > 0) {
                        if (Object.keys(savedIdsByReference).length > 0) {
                            if (args.progress)
                                Output.Printer.printProgress(Response.progress(undefined, undefined, 'Performing insert operation on ' + plan.sobject + ' child record(s)', args.progress));
                        }
                        for (let batchFile of batchFiles) {
                            percentage += increment;
                            if (args.progress)
                                Output.Printer.printProgress(Response.progress(increment, percentage, 'Running Batch ' + batchFile.replace('.json', ''), args.progress));
                            try {
                                const response = await connection.importTreeData(childsFolder + '/' + batchFile);
                                if (response.results) {
                                    for (let insertResult of response.results) {
                                        savedIdsByReference[insertResult.refId] = {
                                            id: insertResult.id,
                                            sobject: insertResult.sobject,
                                        };
                                    }
                                } else {
                                    insertErrosByBatch[batchName] = {
                                        name: batchName,
                                        file: batchFolder + '/' + childsFolder + '/' + batchFile,
                                        errors: response.errors,
                                    };
                                }
                            } catch (error) {
                                reject(error);
                            }
                        }
                    }
                }
            }
            resolve(insertErrosByBatch);
        } catch (error) {
            reject(error);
        }
    });
}

function resolveReferences(args, mastersFolder, childsFolder) {
    if (Object.keys(savedIdsByReference).length > 0) {
        if (args.progress)
            Output.Printer.printProgress(Response.progress(undefined, undefined, 'Resolving References.', args.progress));
        if (FileChecker.isExists(mastersFolder)) {
            let batchFiles = FileReader.readDirSync(mastersFolder);
            if (batchFiles.length > 0) {
                for (let batchFile of batchFiles) {
                    let records = JSON.parse(FileReader.readFileSync(mastersFolder + '/' + batchFile));
                    for (let record of records.records) {
                        Object.keys(record).forEach(function (field) {
                            if (savedIdsByReference[record[field]]) {
                                record[field] = savedIdsByReference[record[field]].id;
                            }
                        });
                    }
                    FileWriter.createFileSync(mastersFolder + '/' + batchFile, JSON.stringify(records, null, 2));
                }
            }
        }
        if (FileChecker.isExists(childsFolder)) {
            let batchFiles = FileReader.readDirSync(childsFolder);
            if (batchFiles.length > 0) {
                for (let batchFile of batchFiles) {
                    let records = JSON.parse(FileReader.readFileSync(childsFolder + '/' + batchFile));
                    for (let record of records.records) {
                        Object.keys(record).forEach(function (field) {
                            if (savedIdsByReference[record[field]]) {
                                record[field] = savedIdsByReference[record[field]].id;
                            }
                        });
                    }
                    FileWriter.createFileSync(childsFolder + '/' + batchFile, JSON.stringify(records, null, 2));
                }
            }
        }
    }
}

function isCorrectPlan(planFile) {
    return new Promise(function (resolve, reject) {
        try {
            let planData = JSON.parse(FileReader.readFileSync(planFile));
            let planFolder = PathUtils.getDirname(planFile);
            let notExistingFiles = getNotExistingFiles(planData, planFolder);
            if (notExistingFiles.length > 0)
                reject(notExistingFiles);
            else
                resolve(planData);
        } catch (error) {
            reject(error);
        }
    });
}

function loadStoredRecordTypes(args) {
    return new Promise(async function (resolve, reject) {
        try {
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, undefined, 'Loading stored Record Types from target org', args.progress));
            const connection = new Connection(username, args.apiVersion, undefined, undefined);
            const records = await connection.query("Select Id, Name, DeveloperName, SobjectType from RecordType");
            for (let record of records) {
                if (!recordTypeByObject[record.SobjectType]) {
                    recordTypeByObject[record.SobjectType] = {
                        sObject: record.SobjectType,
                        recordTypes: {},
                    };
                }
                recordTypeByObject[record.SobjectType].recordTypes[record.DeveloperName] = record;
            }
            if (args.progress)
                Output.Printer.printProgress(Response.progress(undefined, undefined, 'Record Types Loaded Successfully', args.progress));
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function getNotExistingFiles(planData, planFolder) {
    let notExistingFiles = [];
    for (let plan of planData) {
        for (file of plan.files) {
            let filePath = planFolder + "/" + file;
            if (!FileChecker.isExists(filePath)) {
                notExistingFiles.push(filePath);
            }
        }
    }
    return notExistingFiles;
}

function getRecordBatches(records, nRecords) {
    let batch = {};
    let batchId = "batch_";
    let counter = 0;
    for (let record of records) {
        let id = batchId + counter;
        if (!batch[id]) {
            batch[id] = {
                batchId: id,
                records: [],
            };
        }
        if (batch[id].records.length < nRecords) {
            batch[id].records.push(record);
        } else {
            counter++;
        }
    }
    return batch;
}

function reportDeletingProgress(args, millis) {
    if (!deletingFinished) {
        setTimeout(function () {
            if (!deletingFinished) {
                Output.Printer.printProgress(Response.progress(undefined, undefined, '(' + new Date().getTime() + ') Roll back in progress. Please wait.', args.progress));
                reportDeletingProgress(args, millis);
            }
        }, millis);
    }
}

function reportExtractingProgress(args, millis) {
    if (!extractingFinished) {
        setTimeout(function () {
            if (!extractingFinished) {
                Output.Printer.printProgress(Response.progress(undefined, undefined, '(' + new Date().getTime() + ') Extraction in progress. Please wait.', args.progress));
                reportExtractingProgress(args, millis);
            }
        }, millis);
    }
}

