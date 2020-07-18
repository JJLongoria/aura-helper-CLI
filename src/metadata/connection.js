const MetadataTypes = require('./metadataTypes');
const FileSystem = require('../fileSystem');
const MetadataFactory = require('./factory');
const ProcessManager = require('../processes').ProcessManager;
const ProcessEvent = require('../processes').ProcessEvent;
const Utils = require('./utils');
const FileReader = FileSystem.FileReader;
const FileWriter = FileSystem.FileWriter;
const Paths = FileSystem.Paths;
const FileChecker = FileSystem.FileChecker;
const Response = require('../commands/response');
const MathUtils = require('../utils/MathUtils');
const OSUtils = require('../utils/osUtils');

const NOT_INCLUDED_METADATA = {
    StandardValueSet: {
        xmlName: "StandardValueSet",
        suffix: "standardValueSet",
        directoryName: "standardValueSets",
        elements: [
            "AccountContactMultiRoles",
            "AccountContactRole",
            "AccountOwnership",
            "AccountRating",
            "AccountType",
            "AssetStatus",
            "CampaignMemberStatus",
            "CampaignStatus",
            "CampaignType",
            "CaseContactRole",
            "CaseOrigin",
            "CasePriority",
            "CaseReason",
            "CaseStatus",
            "CaseType",
            "ContactRole",
            "ContractContactRole",
            "ContractStatus",
            "EventSubject",
            "EventType",
            "FiscalYearPeriodName",
            "FiscalYearPeriodPrefix",
            "FiscalYearQuarterName",
            "FiscalYearQuarterPrefix",
            "IdeaMultiCategory",
            "IdeaStatus",
            "Industry",
            "LeadSource",
            "LeadStatus",
            "OpportunityCompetitor",
            "OpportunityStage",
            "OpportunityType",
            "OrderStatus",
            "OrderType",
            "PartnerRole",
            "Product2Family",
            "QuickTextCategory",
            "QuickTextChannel",
            "QuoteStatus",
            "SalesTeamRole",
            "Salutation",
            "SocialPostClassification",
            "SocialPostEngagementLevel",
            "SocialPostReviewedStatus",
            "SolutionStatus",
            "TaskPriority",
            "TaskStatus",
            "TaskSubject",
            "TaskType",
            "WorkOrderLineItemStatus",
            "WorkOrderPriority",
            "WorkOrderStatus",
        ]
    }
}

const suffixByMetadataType = {
    CustomField: 'field',
    BusinessProcess: 'businessProcess',
    RecordType: 'recordType',
    CompactLayout: 'compactLayout',
    WebLink: 'webLink',
    ValidationRule: 'validationRule',
    SharingReason: 'sharingReason',
    ListView: 'listView',
    FieldSet: 'fieldSet'
}

let abort = false;
let batches;
let metadata;
let increment;
let percentage;
class Connection {

    static abort() {
        abort = true;
        if (progressReport)
            progressReport.report({ message: "Aborting operation..." });
    }

    static getSpecificMetadataFromOrg(user, objects, options, output) {
        let downloadOptions = {
            orgNamespace: (options && options.orgNamespace) ? options.orgNamespace : "",
            downloadAll: (options && options.downloadAll) ? options.downloadAll : false,
            progressReport: (options && options.progressReport) ? options.progressReport : undefined,
        };
        percentage = 0;
        abort = false;
        return new Promise(function (resolve, reject) {
            metadata = {};
            if (objects && objects.length > 0) {
                objects = objects.sort(function (a, b) {
                    return a.toLowerCase().localeCompare(b.toLowerCase());
                });
                increment = MathUtils.round(100 / objects.length, 2);
                let nBatches = OSUtils.getAvailableCPUs();
                let recordsPerBatch = Math.ceil(objects.length / nBatches);
                batches = [];
                let counter = 0;
                let batch;
                for (const object of objects) {
                    if (!batch) {
                        batch = {
                            batchId: 'Bacth_' + counter,
                            records: [],
                            completed: false
                        }
                        counter++;
                    }
                    if (batch) {
                        batch.records.push(object);
                        if (batch.records.length === recordsPerBatch) {
                            batches.push(batch);
                            batch = undefined;
                        }
                    }
                }
                if (batch)
                    batches.push(batch);
                for (const batchToProcess of batches) {
                    Connection.downloadMatadataFromOrg(user, batchToProcess.records, downloadOptions, output).then(function (downloadedMetadata) {
                        Object.keys(downloadedMetadata).forEach(function (key) {
                            metadata[key] = downloadedMetadata[key];
                        });
                        batchToProcess.completed = true;
                        let nCompleted = 0;
                        for (const resultBatch of batches) {
                            if (resultBatch.completed)
                                nCompleted++;
                        }
                        if (nCompleted === batches.length) {
                            metadata = Utils.orderMetadata(metadata);
                            resolve(metadata);
                        }
                    }).catch(function (error) {
                        reject(error);
                    });
                }
            }
        });
    }

    static getMetadataTypes(user, root, options) {
        if (!options) {
            options = {
                createFile: true,
                forceDownload: false,
            };
        }
        if (options.createFile === undefined) {
            options.createFile = true;
        }
        let folder = root + '/.sfdx/orgs/' + user + '/metadata';
        let file = folder + '/metadataTypes.json';
        return new Promise(async function (resolve, reject) {
            try {
                if (FileChecker.isExists(file) && !options.forceDownload) {
                    resolve(Connection.getMetadataObjectsFromSFDXMetadataTypesFile(file));
                } else {
                    let out = await ProcessManager.listMetadataTypes(user);
                    if (out && out.stdOut) {
                        if (options.createFile) {
                            if (!FileChecker.isExists(folder))
                                FileWriter.createFolderSync(folder);
                            FileWriter.createFileSync(file, out.stdOut);
                            resolve(Connection.getMetadataObjectsFromSFDXMetadataTypesFile(file));
                        } else {
                            let response = JSON.parse(out.stdOut);
                            resolve({ metadataTypes: Connection.getMetadataObjectsFromSFDXResult(response.result.metadataObjects), namespace: response.result.organizationNamespace });
                        }
                    } else {
                        reject();
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    static getMetadataObjectsFromSFDXMetadataTypesFile(file) {
        let metadataFromSFDX = JSON.parse(FileReader.readFileSync(file)).result.metadataObjects;
        return Connection.getMetadataObjectsFromSFDXResult(metadataFromSFDX);
    }

    static getMetadataObjectsFromSFDXResult(metadataFromSFDX) {
        let metadataObjects = [];
        for (const metadata of metadataFromSFDX) {
            if (abort) {
                return;
            }
            metadataObjects.push({
                directoryName: metadata.directoryName,
                inFolder: metadata.inFolder,
                metaFile: metadata.metaFile,
                suffix: metadata.suffix,
                xmlName: metadata.xmlName
            });
            if (metadata.childXmlNames && metadata.childXmlNames.length > 0) {
                for (const childXMLName of metadata.childXmlNames) {
                    metadataObjects.push({
                        directoryName: metadata.directoryName,
                        inFolder: metadata.inFolder,
                        metaFile: metadata.metaFile,
                        suffix: (suffixByMetadataType[childXMLName]) ? suffixByMetadataType[childXMLName] : metadata.suffix,
                        xmlName: childXMLName
                    });
                }
            }
        }
        return metadataObjects;
    }

    static downloadMatadataFromOrg(user, metadataObjects, options, output) {
        return new Promise(async function (resolve, reject) {
            try {
                let metadata = {};
                let folders = await Connection.getFolders(user);
                for (const metadataObject of metadataObjects) {
                    let objName = (metadataObject.xmlName) ? metadataObject.xmlName : metadataObject;
                    let foldersByType = Connection.getFoldersByType(folders, objName);
                    let metadataType;
                    if (objName === MetadataTypes.REPORTS || objName === MetadataTypes.DASHBOARD || objName === MetadataTypes.DOCUMENT) {
                        for (const folder of foldersByType) {
                            let folderName = "unfiled$public";
                            if (folder.DeveloperName) {
                                folderName = folder.DeveloperName;
                            }
                            metadataType = await Connection.describeMetadataFromFolder(user, objName, folderName, options);
                            percentage += increment;
                            if (output && options.progressReport) {
                                output.Printer.printProgress(Response.progress(MathUtils.round(percentage, 2), 'MetadataType: ' + objName, options.progressReport));
                            }
                            if (metadataType) {
                                if (!metadata[objName])
                                    metadata[objName] = metadataType;
                                else {
                                    Object.keys(metadataType.childs).forEach(function (key) {
                                        metadata[objName].childs[key] = metadataType.childs[key];
                                    });
                                }
                            }
                        }
                    } else if (objName === MetadataTypes.EMAIL_TEMPLATE) {
                        metadataType = await Connection.getEmailTemplates(user, objName, folders, options);
                        percentage += increment;
                        if (output && options.progressReport) {
                            output.Printer.printProgress(Response.progress(MathUtils.round(percentage, 2), 'MetadataType: ' + objName, options.progressReport));
                        }
                        if (metadataType)
                            metadata[objName] = metadataType;
                    } else {
                        // TODO: Report Progress
                        metadataType = await Connection.getMetadataObjectsFromOrg(user, objName, options);
                        percentage += increment;
                        if (output && options.progressReport) {
                            output.Printer.printProgress(Response.progress(MathUtils.round(percentage, 2), 'MetadataType: ' + objName, options.progressReport));
                        }
                        if (metadataType)
                            metadata[objName] = metadataType;
                    }
                }
                resolve(metadata);
            } catch (error) {
                reject(error);
            }
        });
    }

    static getFolders(user) {
        return new Promise(async function (resolve, reject) {
            let query = 'Select Id, Name, DeveloperName, NamespacePrefix, Type FROM Folder';
            try {
                let out = await ProcessManager.query(user, query);
                if (out.stdOut && out.stdOut > 0) {
                    let outJson = JSON.parse(out.stdOut);
                    if (outJson.status === 0) {
                        resolve(Utils.forceArray(outJson.result.records));
                    } else {
                        resolve([])
                    }
                } else
                    resolve([]);
            } catch (error) {
                reject(error);
            }

        });
    }

    static getEmailTemplates(user, metadataTypeName, folders, options) {
        return new Promise(async function (resolve, reject) {
            let metadataType = MetadataFactory.createMetadataType(metadataTypeName, false);
            let query = 'Select Id, Name, DeveloperName, NamespacePrefix, FolderId FROM EmailTemplate';
            try {
                let out = await ProcessManager.query(user, query);
                if (out.stdOut && out.stdOut > 0) {
                    let outJson = JSON.parse(out.stdOut);
                    if (outJson.status === 0) {
                        let records = Utils.forceArray(outJson.result.records);
                        for (const email of records) {
                            let folder = Connection.getFolderDevName(folders, email.FolderId);
                            if (options.downloadAll) {
                                if (!metadataType.childs[folder])
                                    metadataType.childs[folder] = MetadataFactory.createMetadataObject(folder, false);
                                metadataType.childs[folder].childs[email.DeveloperName] = MetadataFactory.createMetadataItem(email.DeveloperName, false);
                            } else if (!email.NamespacePrefix || email.NamespacePrefix === options.orgNamespace) {
                                if (!metadataType.childs[folder])
                                    metadataType.childs[folder] = MetadataFactory.createMetadataObject(folder, false);
                                metadataType.childs[folder].childs[email.DeveloperName] = MetadataFactory.createMetadataItem(email.DeveloperName, false);
                            }
                        }
                        resolve(metadataType);
                    } else {
                        resolve(undefined)
                    }
                } else
                    resolve(undefined);
            } catch (error) {
                reject(error);
            }

        });
    }

    static getMetadataObjectsFromOrg(user, metadataTypeName, options) {
        return new Promise(async function (resolve, reject) {
            try {
                if (NOT_INCLUDED_METADATA[metadataTypeName]) {
                    let metadataType = MetadataFactory.createMetadataType(metadataTypeName, false);
                    let metadataObjects = {};
                    for (const element of NOT_INCLUDED_METADATA[metadataTypeName].elements) {
                        metadataObjects[element] = MetadataFactory.createMetadataObject(element, false);
                    }
                    metadataType.childs = metadataObjects;
                    resolve(metadataType);
                } else {
                    let out = await ProcessManager.describeMetadata(user, metadataTypeName, undefined);
                    if (out.stdOut) {
                        let metadataType = Connection.processMetadataType(out.stdOut, metadataTypeName, options);
                        resolve(metadataType);
                    } else {

                    }
                }
            } catch (error) {

            }
        });
    }

    static describeMetadataFromFolder(user, metadataTypeName, folderName, options) {
        return new Promise(async function (resolve, reject) {
            let out = await ProcessManager.describeMetadata(user, metadataTypeName, folderName);
            if (out.stdOut) {
                let metadataType = Connection.processMetadataType(out.stdOut, metadataTypeName, options);
                resolve(metadataType);
            } else {

            }
        });
    }

    static getFoldersByType(folders, type) {
        let result = [];
        for (const folder of folders) {
            if (folder.Type === type) {
                result.push(folder);
            }
        }
        return result;
    }

    static getFolderDevName(folders, folderId) {
        for (const folder of folders) {
            if (folder.Id === folderId) {
                return folder.DeveloperName;
            }
        }
        return 'unfiled$public'
    }

    static processMetadataType(stdOut, metadataTypeName, options) {
        if (!stdOut || stdOut.length === 0)
            return undefined;
        let metadataType;
        let data = JSON.parse(stdOut);
        if (data.status === 0) {
            let dataList = Utils.forceArray(data.result);
            metadataType = MetadataFactory.createMetadataType(metadataTypeName, false);
            let objects = {};
            for (const obj of dataList) {
                let separator;
                if (metadataTypeName === MetadataTypes.EMAIL_TEMPLATE || metadataTypeName === MetadataTypes.DOCUMENT || metadataTypeName === MetadataTypes.REPORTS || metadataTypeName === MetadataTypes.DASHBOARD) {
                    separator = '/';
                } else if (metadataTypeName === MetadataTypes.LAYOUT || metadataTypeName === MetadataTypes.CUSTOM_OBJECT_TRANSLATIONS || metadataTypeName === MetadataTypes.FLOWS || metadataTypeName === MetadataTypes.STANDARD_VALUE_SET_TRANSLATION) {
                    separator = '-';
                } else {
                    separator = '.';
                }
                let name;
                let item;
                if (obj) {
                    if (obj.fullName.indexOf(separator) != -1) {
                        name = obj.fullName.substring(0, obj.fullName.indexOf(separator));
                        item = obj.fullName.substring(obj.fullName.indexOf(separator) + 1);
                    } else {
                        name = obj.fullName;
                    }
                    if (options.downloadAll) {
                        if (!item) {
                            if (!objects[name])
                                objects[name] = MetadataFactory.createMetadataObject(name, false);
                        } else {
                            if (!objects[name])
                                objects[name] = MetadataFactory.createMetadataObject(name, false);
                            objects[name].childs[item] = MetadataFactory.createMetadataItem(item, false);
                        }
                    } else {
                        if (!item && (!obj.namespacePrefix || obj.namespacePrefix === options.orgNamespace)) {
                            if (!objects[name])
                                objects[name] = MetadataFactory.createMetadataObject(name, false);
                        } else if (!obj.namespacePrefix || obj.namespacePrefix === options.orgNamespace) {
                            if (!objects[name])
                                objects[name] = MetadataFactory.createMetadataObject(name, false);
                            objects[name].childs[item] = MetadataFactory.createMetadataItem(item, false);
                        }
                    }
                }
            }
            Object.keys(objects).forEach(function (key) {
                metadataType.childs[key] = objects[key];
            });
        }
        return metadataType;
    }

}
module.exports = Connection;