const fileSystem = require('../fileSystem');
const MetadataTypes = require('./metadataTypes');
const Utils = require('./utils');
const StrUtils = require('../utils/strUtils');
const languages = require('../languages');
const Config = require('../main/config');
const FileReader = fileSystem.FileReader;
const FileChecker = fileSystem.FileChecker;
const Paths = fileSystem.Paths;
const XMLParser = languages.XMLParser;

METADATA_XML_RELATION = {
     Workflow: {
          outboundMessages: {
               fieldKey: 'fullName',
               type: MetadataTypes.WORKFLOW_OUTBOUND_MESSAGE
          },
          knowledgePublishes: {
               fieldKey: 'fullName',
               type: MetadataTypes.WORKFLOW_KNOWLEDGE_PUBLISH
          },
          tasks: {
               fieldKey: 'fullName',
               type: MetadataTypes.WORKFLOW_TASK
          },
          rules: {
               fieldKey: 'fullName',
               type: MetadataTypes.WORKFLOW_RULE
          },
          fieldUpdates: {
               fieldKey: 'fullName',
               type: MetadataTypes.WORKFLOW_FIELD_UPDATE
          },
          alerts: {
               fieldKey: 'fullName',
               type: MetadataTypes.WORKFLOW_ALERT
          }
     },
     SharingRules: {
          sharingCriteriaRules: {
               fieldKey: 'fullName',
               type: MetadataTypes.SHARING_CRITERIA_RULE
          },
          sharingOwnerRules: {
               fieldKey: 'fullName',
               type: MetadataTypes.SHARING_OWNER_RULE
          },
          sharingGuestRules: {
               fieldKey: 'fullName',
               type: MetadataTypes.SHARING_GUEST_RULE
          },
          sharingTerritoryRules: {
               fieldKey: 'fullName',
               type: MetadataTypes.SHARING_TERRITORY_RULE
          }
     },
     AssignmentRules: {
          assignmentRule: {
               fieldKey: 'fullName',
               type: MetadataTypes.ASSIGNMENT_RULE
          }
     },
     AutoResponseRules: {
          autoresponseRule: {
               fieldKey: 'fullName',
               type: MetadataTypes.AUTORESPONSE_RULE
          }
     },
     EscalationRules: {
          escalationRule: {
               fieldKey: 'fullName',
               type: MetadataTypes.ESCALATION_RULE
          }
     },
     MatchingRules: {
          matchingRules: {
               fieldKey: 'fullName',
               type: MetadataTypes.MATCHING_RULE
          }
     },
     CustomLabels: {
          labels: {
               fieldKey: 'fullName',
               type: MetadataTypes.CUSTOM_LABEL
          }
     }
}




class MetadataFactory {

     static getMetadataXMLRelation() {
          return METADATA_XML_RELATION;
     }

     static createFolderMetadataMap(dataFromOrg) {
          let folderMetadataMap = {};
          for (const metadataType of dataFromOrg) {
               if (metadataType.xmlName === MetadataTypes.CUSTOM_FIELDS) {
                    folderMetadataMap[metadataType.directoryName + '/fields'] = metadataType;
               } else if (metadataType.xmlName === MetadataTypes.INDEX) {
                    folderMetadataMap[metadataType.directoryName + '/indexes'] = metadataType;
               } else if (metadataType.xmlName === MetadataTypes.BUSINESS_PROCESS) {
                    folderMetadataMap[metadataType.directoryName + '/businessProcesses'] = metadataType;
               } else if (metadataType.xmlName === MetadataTypes.COMPACT_LAYOUT) {
                    folderMetadataMap[metadataType.directoryName + '/compactLayouts'] = metadataType;
               } else if (metadataType.xmlName === MetadataTypes.RECORD_TYPE) {
                    folderMetadataMap[metadataType.directoryName + '/recordTypes'] = metadataType;
               } else if (metadataType.xmlName === MetadataTypes.BUTTON_OR_LINK) {
                    folderMetadataMap[metadataType.directoryName + '/webLinks'] = metadataType;
               } else if (metadataType.xmlName === MetadataTypes.VALIDATION_RULE) {
                    folderMetadataMap[metadataType.directoryName + '/validationRules'] = metadataType;
               } else if (metadataType.xmlName === MetadataTypes.SHARING_REASON) {
                    folderMetadataMap[metadataType.directoryName + '/sharingReasons'] = metadataType;
               } else if (metadataType.xmlName === MetadataTypes.LISTVIEW) {
                    folderMetadataMap[metadataType.directoryName + '/listViews'] = metadataType;
               } else if (metadataType.xmlName === MetadataTypes.FIELD_SET) {
                    folderMetadataMap[metadataType.directoryName + '/fieldSets'] = metadataType;
               } else if (!folderMetadataMap[metadataType.directoryName]) {
                    folderMetadataMap[metadataType.directoryName] = metadataType;
               }
          }
          return folderMetadataMap;
     }

     static createMetadataType(name, checked, path, suffix) {
          return {
               name: name,
               checked: (checked) ? checked : false,
               childs: {},
               path: path,
               suffix: suffix
          };
     }

     static createMetadataObject(name, checked, path) {
          return {
               name: name,
               checked: (checked) ? checked : false,
               childs: {},
               path: path,
          };
     }

     static createMetadataItem(name, checked, path) {
          return {
               name: name,
               checked: (checked) ? checked : false,
               path: path,
          };
     }

     static getMetadataObjectsFromFileSystem(folderMetadataMap, root) {
          let metadata = {};
          let projectConfig = Config.getProjectConfig(root);
          for (const packageDirectory of projectConfig.packageDirectories) {
               let directory = root + '/' + packageDirectory.path + '/main/default';
               let folders = FileReader.readDirSync(directory);
               for (const folder of folders) {
                    let metadataType = folderMetadataMap[folder];
                    if (metadataType) {
                         let folderPath = directory + '/' + folder;
                         if (folder == 'objects') {
                              metadata = MetadataFactory.getCustomObjectsMetadata(metadata, folderPath);
                         } else if (folder == 'approvalProcesses') {
                              metadata[metadataType.xmlName] = MetadataFactory.getApprovalProcessesMetadataFromFolder(folderPath);
                         } else if (folder == 'customMetadata') {
                              metadata[metadataType.xmlName] = MetadataFactory.getCustomMetadataFromFolder(folderPath);
                         } else if (folder == 'dashboards') {
                              metadata[metadataType.xmlName] = MetadataFactory.getDashboardsMetadataFromFolder(folderPath);
                         } else if (folder == 'documents') {
                              metadata[metadataType.xmlName] = MetadataFactory.getDocumentsMetadataFromFolder(folderPath);
                         } else if (folder == 'duplicateRules') {
                              metadata[metadataType.xmlName] = MetadataFactory.getDuplicateRulesMetadataFromFolder(folderPath);
                         } else if (folder == 'email') {
                              metadata[metadataType.xmlName] = MetadataFactory.getEmailTemplateMetadataFromFolder(folderPath);
                         } else if (folder == 'flows') {
                              metadata[metadataType.xmlName] = MetadataFactory.getFlowsMetadataFromFolder(folderPath);
                         } else if (folder == 'layouts') {
                              metadata[metadataType.xmlName] = MetadataFactory.getLayoutsMetadataFromFolder(folderPath);
                         } else if (folder == 'objectTranslations') {
                              metadata[metadataType.xmlName] = MetadataFactory.getObjectTranslationsMetadataFromFolder(folderPath);
                         } else if (folder == 'reports') {
                              metadata[metadataType.xmlName] = MetadataFactory.getReportsMetadataFromFolder(folderPath);
                         } else if (folder == 'quickActions') {
                              metadata[metadataType.xmlName] = MetadataFactory.getQuickActionsMetadataFromFolder(folderPath);
                         } else if (folder == 'standardValueSetTranslations') {
                              metadata[metadataType.xmlName] = MetadataFactory.getStandardValueSetTranslationMetadataFromFolder(folderPath);
                         } else if (folder == 'lwc') {
                              let newMetadata = MetadataFactory.createMetadataType(metadataType.xmlName, false, folderPath, metadataType.suffix);
                              newMetadata.childs = MetadataFactory.getMetadataObjects(folderPath, true);
                              metadata[metadataType.xmlName] = newMetadata;
                         } else if (folder == 'aura') {
                              let newMetadata = MetadataFactory.createMetadataType(metadataType.xmlName, false, folderPath, metadataType.suffix);
                              newMetadata.childs = MetadataFactory.getMetadataObjects(folderPath, true);
                              metadata[metadataType.xmlName] = newMetadata;
                         } else if (METADATA_XML_RELATION[metadataType.xmlName]) {
                              MetadataFactory.getMetadataFromFiles(metadataType, metadata, folderPath);
                         } else {
                              let newMetadata = MetadataFactory.createMetadataType(metadataType.xmlName, false, folderPath, metadataType.suffix);
                              newMetadata.childs = MetadataFactory.getMetadataObjects(folderPath);
                              metadata[metadataType.xmlName] = newMetadata;
                         }
                    }
               }
          }
          metadata = Utils.orderMetadata(metadata);
          return metadata;
     }

     static getMetadataFromFiles(metadataType, metadata, folderPath) {
          let mainObject = MetadataFactory.createMetadataType(metadataType.xmlName, false, folderPath, metadataType.suffix);
          mainObject.childs = MetadataFactory.getMetadataObjects(folderPath, false);
          metadata[metadataType.xmlName] = mainObject;
          let files = FileReader.readDirSync(folderPath);
          let collectionsData = METADATA_XML_RELATION[metadataType.xmlName];
          for (const file of files) {
               let path = folderPath + '/' + file;
               let xmlData = XMLParser.parseXML(FileReader.readFileSync(path));
               if (metadataType.xmlName === MetadataTypes.CUSTOM_LABELS) {
                    if (xmlData[metadataType.xmlName]) {
                         Object.keys(collectionsData).forEach(function (collectionName) {
                              let collectionData = collectionsData[collectionName];
                              if (xmlData[metadataType.xmlName][collectionName]) {
                                   xmlData[metadataType.xmlName][collectionName] = Utils.forceArray(xmlData[metadataType.xmlName][collectionName]);
                                   for (let xmlElement of xmlData[metadataType.xmlName][collectionName]) {
                                        let elementKey = xmlElement[collectionData.fieldKey];
                                        if (!metadata[collectionData.type])
                                             metadata[collectionData.type] = MetadataFactory.createMetadataType(collectionData.type, false, folderPath, metadataType.suffix);
                                        if (!metadata[collectionData.type].childs[elementKey])
                                             metadata[collectionData.type].childs[elementKey] = MetadataFactory.createMetadataObject(elementKey, false, path);
                                   }
                              }
                         });
                    }
               } else {
                    if (xmlData[metadataType.xmlName]) {
                         Object.keys(collectionsData).forEach(function (collectionName) {
                              let collectionData = collectionsData[collectionName];
                              if (xmlData[metadataType.xmlName][collectionName]) {
                                   let sObj = file.substring(0, file.indexOf('.'));
                                   if (!metadata[collectionData.type])
                                        metadata[collectionData.type] = MetadataFactory.createMetadataType(collectionData.type, false, folderPath, metadataType.suffix);
                                   if (!metadata[collectionData.type].childs[sObj])
                                        metadata[collectionData.type].childs[sObj] = MetadataFactory.createMetadataObject(sObj, false);
                                   xmlData[metadataType.xmlName][collectionName] = Utils.forceArray(xmlData[metadataType.xmlName][collectionName]);
                                   for (let xmlElement of xmlData[metadataType.xmlName][collectionName]) {
                                        let elementKey = xmlElement[collectionData.fieldKey];
                                        if (!metadata[collectionData.type].childs[sObj].childs[elementKey])
                                             metadata[collectionData.type].childs[sObj].childs[elementKey] = MetadataFactory.createMetadataObject(elementKey, false, path);
                                   }
                              }
                         });
                    }
               }
          }
     }

     static getApprovalProcessesMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.APPROVAL_PROCESSES, false, folderPath);
          let metadataObjects = {};
          for (const file of files) {
               let path = folderPath + '/' + file;
               let fileParts = file.split('.');
               let sObj = fileParts[0];
               let metadataName = fileParts[1];
               if (!metadataObjects[sObj])
                    metadataObjects[sObj] = MetadataFactory.createMetadataObject(sObj, false, folderPath);
               if (metadataName && metadataName.length > 0 && !metadataObjects[sObj].childs[metadataName])
                    metadataObjects[sObj].childs[metadataName] = MetadataFactory.createMetadataItem(metadataName, false, path);
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getDuplicateRulesMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.DUPLICATE_RULE, false, folderPath);
          let metadataObjects = {};
          for (const file of files) {
               let path = folderPath + '/' + file;
               let fileParts = file.split('.');
               let sObj = fileParts[0];
               let rule = fileParts[1];
               if (!metadataObjects[sObj])
                    metadataObjects[sObj] = MetadataFactory.createMetadataObject(sObj, false, folderPath);
               if (rule && rule.length > 0 && !metadataObjects[sObj].childs[rule])
                    metadataObjects[sObj].childs[rule] = MetadataFactory.createMetadataItem(rule, false, path);
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getQuickActionsMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.QUICK_ACTION, false, folderPath);
          let metadataObjects = {};
          for (const file of files) {
               let path = folderPath + '/' + file;
               let fileParts = file.split('.');
               let sObj = fileParts[0];
               let action = fileParts[1];
               if (!metadataObjects[sObj])
                    metadataObjects[sObj] = MetadataFactory.createMetadataObject(sObj, false, folderPath);
               if (action && action.length > 0 && !metadataObjects[sObj].childs[action])
                    metadataObjects[sObj].childs[action] = MetadataFactory.createMetadataItem(action, false, path);
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getDashboardsMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.DASHBOARD, false, folderPath);
          let metadataObjects = {};
          for (const dashboardFolder of files) {
               let fPath = folderPath + '/' + dashboardFolder;
               if (dashboardFolder.indexOf('.') === -1) {
                    if (!metadataObjects[dashboardFolder])
                         metadataObjects[dashboardFolder] = MetadataFactory.createMetadataObject(dashboardFolder, false, fPath);
                    let dashboards = FileReader.readDirSync(fPath);
                    for (const dashboard of dashboards) {
                         let path = fPath + '/' + dashboard;
                         let name = dashboard.substring(0, dashboard.indexOf('.'));
                         if (name && name.length > 0 && !metadataObjects[dashboardFolder].childs[name])
                              metadataObjects[dashboardFolder].childs[name] = MetadataFactory.createMetadataItem(name, false, path);
                    }
               }
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getReportsMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.REPORTS, false, folderPath);
          let metadataObjects = {};
          for (const reportsFolder of files) {
               let fPath = folderPath + '/' + reportsFolder;
               if (reportsFolder.indexOf('.') === -1) {
                    if (!metadataObjects[reportsFolder])
                         metadataObjects[reportsFolder] = MetadataFactory.createMetadataObject(reportsFolder, false, fPath);
                    let reports = FileReader.readDirSync(fPath);
                    for (const report of reports) {
                         let path = fPath + '/' + report;
                         let name = report.substring(0, report.indexOf('.'));
                         if (name && name.length > 0 && !metadataObjects[reportsFolder].childs[name])
                              metadataObjects[reportsFolder].childs[name] = MetadataFactory.createMetadataItem(name, false, path);
                    }
               }
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getDocumentsMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.DOCUMENT, false, folderPath);
          let metadataObjects = {};
          for (const docFolder of files) {
               let fPath = folderPath + '/' + docFolder;
               if (docFolder.indexOf('.') === -1) {
                    if (!metadataObjects[docFolder])
                         metadataObjects[docFolder] = MetadataFactory.createMetadataObject(docFolder, false, fPath);
                    let docs = FileReader.readDirSync(fPath);
                    for (const doc of docs) {
                         let path = fPath + '/' + doc;
                         if (doc.indexOf('.document-meta.xml') === -1) {
                              if (doc && doc.length > 0 && !metadataObjects[docFolder].childs[doc])
                                   metadataObjects[docFolder].childs[doc] = MetadataFactory.createMetadataItem(doc, false, path);
                         }
                    }
               }
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getObjectTranslationsMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.CUSTOM_OBJECT_TRANSLATIONS, false, folderPath);
          let metadataObjects = {};
          for (const translationFolder of files) {
               let path = folderPath + '/' + translationFolder;
               let fileParts = translationFolder.split('-');
               let sObj = fileParts[0];
               let translation = fileParts[1];
               if (!metadataObjects[sObj])
                    metadataObjects[sObj] = MetadataFactory.createMetadataObject(sObj, false, folderPath);
               if (translation && translation.length > 0 && !metadataObjects[sObj].childs[translation])
                    metadataObjects[sObj].childs[translation] = MetadataFactory.createMetadataItem(translation, false, path);
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getEmailTemplateMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.EMAIL_TEMPLATE, false, folderPath);
          let metadataObjects = {};
          for (const emailFolder of files) {
               let fPath = folderPath + '/' + emailFolder;
               if (emailFolder.indexOf('.') === -1) {
                    if (!metadataObjects[emailFolder])
                         metadataObjects[emailFolder] = MetadataFactory.createMetadataObject(emailFolder, false, fPath);
                    let emails = FileReader.readDirSync(folderPath + '/' + emailFolder);
                    for (const email of emails) {
                         let path = fPath + '/' + email;
                         let name = email.substring(0, email.indexOf('.'));
                         if (name && name.length > 0 && !metadataObjects[emailFolder].childs[name])
                              metadataObjects[emailFolder].childs[name] = MetadataFactory.createMetadataItem(name, false, path);
                    }
               }
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getFlowsMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.FLOWS, false, folderPath);
          let metadataObjects = {};
          for (const flowFile of files) {
               let path = folderPath + '/' + flowFile;
               let name = flowFile.substring(0, flowFile.indexOf('.'));
               let flow = undefined
               let version = undefined;
               if (name.indexOf('-') !== -1) {
                    flow = name.substring(0, name.indexOf('-')).trim();
                    version = name.substring(name.indexOf('-') + 1).trim();
               } else {
                    flow = name.trim();
               }
               if (!metadataObjects[flow])
                    metadataObjects[flow] = MetadataFactory.createMetadataObject(flow, false, folderPath);
               if (version && version.length > 0)
                    metadataObjects[flow].childs[version] = MetadataFactory.createMetadataItem(version, false, path);
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getStandardValueSetTranslationMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.STANDARD_VALUE_SET_TRANSLATION, false, folderPath);
          let metadataObjects = {};
          for (const translationFile of files) {
               let path = folderPath + '/' + flowFile;
               let name = translationFile.substring(0, translationFile.indexOf('.'));
               let translation = undefined
               let version = undefined;
               if (name.indexOf('-') !== -1) {
                    translation = name.substring(0, name.indexOf('-')).trim();
                    version = name.substring(name.indexOf('-') + 1).trim();
               } else {
                    translation = name.trim();
               }
               if (!metadataObjects[translation])
                    metadataObjects[translation] = MetadataFactory.createMetadataObject(translation, false, folderPath);
               if (version && version.length > 0)
                    metadataObjects[translation].childs[version] = MetadataFactory.createMetadataItem(version, false, path);
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getLayoutsMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.LAYOUT, false, folderPath);
          let metadataObjects = {};
          for (const layoutFile of files) {
               let path = folderPath + '/' + layoutFile;
               let name = layoutFile.substring(0, layoutFile.indexOf('.'));
               let sObj = name.substring(0, name.indexOf('-')).trim();
               let layout = name.substring(name.indexOf('-') + 1).trim();
               if (!metadataObjects[sObj])
                    metadataObjects[sObj] = MetadataFactory.createMetadataObject(sObj, false, folderPath);
               if (layout && layout.length > 0)
                    metadataObjects[sObj].childs[layout] = MetadataFactory.createMetadataItem(layout, false, path);
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getCustomMetadataFromFolder(folderPath) {
          let files = FileReader.readDirSync(folderPath);
          let metadataType = MetadataFactory.createMetadataType(MetadataTypes.CUSTOM_METADATA, false);
          let metadataObjects = {};
          for (const file of files) {
               let path = folderPath + '/' + file;
               let fileParts = file.split('.');
               let sObj = fileParts[0];
               let approvalName = fileParts[1];
               if (!metadataObjects[sObj])
                    metadataObjects[sObj] = MetadataFactory.createMetadataObject(sObj, false, folderPath);
               metadataObjects[sObj].childs[approvalName] = MetadataFactory.createMetadataItem(approvalName, false, path);
          }
          metadataType.childs = metadataObjects;
          return metadataType;
     }

     static getCustomObjectsMetadata(metadata, objectsPath) {
          let files = FileReader.readDirSync(objectsPath);
          metadata[MetadataTypes.CUSTOM_OBJECT] = MetadataFactory.createMetadataType(MetadataTypes.CUSTOM_OBJECT, false, objectsPath);
          metadata[MetadataTypes.CUSTOM_FIELDS] = MetadataFactory.createMetadataType(MetadataTypes.CUSTOM_FIELDS, false, objectsPath);
          metadata[MetadataTypes.RECORD_TYPE] = MetadataFactory.createMetadataType(MetadataTypes.RECORD_TYPE, false, objectsPath);
          metadata[MetadataTypes.LISTVIEW] = MetadataFactory.createMetadataType(MetadataTypes.LISTVIEW, false, objectsPath);
          metadata[MetadataTypes.BUSINESS_PROCESS] = MetadataFactory.createMetadataType(MetadataTypes.BUSINESS_PROCESS, false, objectsPath);
          metadata[MetadataTypes.COMPACT_LAYOUT] = MetadataFactory.createMetadataType(MetadataTypes.COMPACT_LAYOUT, false, objectsPath);
          metadata[MetadataTypes.VALIDATION_RULE] = MetadataFactory.createMetadataType(MetadataTypes.VALIDATION_RULE, false, objectsPath);
          metadata[MetadataTypes.BUTTON_OR_LINK] = MetadataFactory.createMetadataType(MetadataTypes.BUTTON_OR_LINK, false, objectsPath);
          for (const objFolder of files) {
               let objPath = objectsPath + '/' + objFolder;
               let objFilePath = objPath + '/' + objFolder + '.object-meta.xml';
               if (FileChecker.isExists(objPath + '/fields')) {
                    let fields = MetadataFactory.createMetadataObject(objFolder, false, objPath + '/fields');
                    fields.childs = MetadataFactory.getMetadataItems(objPath + '/fields', false);
                    metadata[MetadataTypes.CUSTOM_FIELDS].childs[objFolder] = fields;
               }
               if (FileChecker.isExists(objPath + '/recordTypes')) {
                    let recordTypes = MetadataFactory.createMetadataObject(objFolder, false, objPath + '/recordTypes');
                    recordTypes.childs = MetadataFactory.getMetadataItems(objPath + '/recordTypes');
                    metadata[MetadataTypes.RECORD_TYPE].childs[objFolder] = recordTypes;
               }
               if (FileChecker.isExists(objPath + '/listViews')) {
                    let listviews = MetadataFactory.createMetadataObject(objFolder, false, objPath + '/listViews');
                    listviews.childs = MetadataFactory.getMetadataItems(objPath + '/listViews');
                    metadata[MetadataTypes.LISTVIEW].childs[objFolder] = listviews;
               }
               if (FileChecker.isExists(objPath + '/businessProcesses')) {
                    let bussinesProcesses = MetadataFactory.createMetadataObject(objFolder, false, objPath + '/businessProcesses');
                    bussinesProcesses.childs = MetadataFactory.getMetadataItems(objPath + '/businessProcesses');
                    metadata[MetadataTypes.BUSINESS_PROCESS].childs[objFolder] = bussinesProcesses;
               }
               if (FileChecker.isExists(objPath + '/compactLayouts')) {
                    let compactLayouts = MetadataFactory.createMetadataObject(objFolder, false, objPath + '/compactLayouts');
                    compactLayouts.childs = MetadataFactory.getMetadataItems(objPath + '/compactLayouts');
                    metadata[MetadataTypes.COMPACT_LAYOUT].childs[objFolder] = compactLayouts;
               }
               if (FileChecker.isExists(objPath + '/validationRules')) {
                    let validationRules = MetadataFactory.createMetadataObject(objFolder, false, objPath + '/validationRules');
                    validationRules.childs = MetadataFactory.getMetadataItems(objPath + '/validationRules');
                    metadata[MetadataTypes.VALIDATION_RULE].childs[objFolder] = validationRules;
               }
               if (FileChecker.isExists(objPath + '/webLinks')) {
                    let weblinks = MetadataFactory.createMetadataObject(objFolder, false, objPath + '/webLinks');
                    weblinks.childs = MetadataFactory.getMetadataItems(objPath + '/webLinks');
                    metadata[MetadataTypes.BUTTON_OR_LINK].childs[objFolder] = weblinks;
               }
               if (FileChecker.isExists(objFilePath)) {
                    metadata[MetadataTypes.CUSTOM_OBJECT].childs[objFolder] = MetadataFactory.createMetadataObject(objFolder, false, objFilePath);
               }
          }
          return metadata;
     }

     static getMetadataObjects(folderPath, onlyFolders) {
          let objects = {};
          let objNamesAdded = [];
          if (FileChecker.isExists(folderPath)) {
               let files = FileReader.readDirSync(folderPath);
               for (const file of files) {
                    let path = folderPath + '/' + file;
                    if (onlyFolders && file.indexOf('.') == -1) {
                         if (!objNamesAdded.includes(file)) {
                              objects[file] = MetadataFactory.createMetadataObject(file, false, path);
                              objNamesAdded.push(file);
                         }
                    } else if (!onlyFolders) {
                         let name = file.substring(0, file.indexOf('.'));
                         if (!objNamesAdded.includes(name)) {
                              objects[name] = MetadataFactory.createMetadataObject(name, false, path);
                              objNamesAdded.push(name);
                         }
                    }
               }
          }
          return objects;
     }

     static getMetadataItems(folderPath, onlyFolders) {
          let items = {};
          let itemsAdded = [];
          if (FileChecker.isExists(folderPath)) {
               let files = FileReader.readDirSync(folderPath);
               for (const file of files) {
                    let path = folderPath + '/' + file;
                    if (onlyFolders && file.indexOf('.') == -1) {
                         if (!itemsAdded.includes(file)) {
                              items[file] = this.createMetadataItem(file, false, path);
                              itemsAdded.push(file);
                         }
                    } else {
                         let name = file.substring(0, file.indexOf('.'));
                         if (!itemsAdded.includes(name)) {
                              items[name] = this.createMetadataItem(name, false, path);
                              itemsAdded.push(name);
                         }
                    }
               }
          }
          return items;
     }

     static getMetadataFromGitDiffs(root, diffs, folderMetadataMap) {
          let metadataRootFolder = root + '/force-app/main/default';
          let metadataForDeploy = {};
          let metadataForDelete = {};
          for (const diff of diffs) {
               let typeFolder = '';
               let filePath = '';
               let baseFolder = StrUtils.replace(Paths.getFolderPath(root + '/' + diff.path), ',', '');
               let fileNameWithExt = Paths.getBasename(diff.path);
               baseFolder = baseFolder.replace(metadataRootFolder + '/', '');
               let baseFolderSplits = baseFolder.split('/');
               let fistPartBaseFolder = baseFolderSplits[0];
               let lastPartFolder = baseFolderSplits[baseFolderSplits.length - 1];
               let metadataType;
               if (fistPartBaseFolder === 'lwc' && (fileNameWithExt === '.eslintrc.json' || fileNameWithExt === '.jsconfig.eslintrc.json'))
                    continue;
               if (fistPartBaseFolder === 'objects') {
                    metadataType = folderMetadataMap[fistPartBaseFolder + '/' + lastPartFolder];
               } else {
                    metadataType = folderMetadataMap[baseFolder];
               }
               if (!metadataType) {
                    metadataType = folderMetadataMap[fistPartBaseFolder];
               }
               if (metadataType) {
                    typeFolder = metadataRootFolder + '/' + metadataType.directoryName;
                    filePath = root + '/' + diff.path;
                    let fileName;
                    if (metadataType.xmlName !== MetadataTypes.DOCUMENT && fileNameWithExt.indexOf('Folder-meta.xml') === -1) {
                         fileName = StrUtils.replace(fileNameWithExt, '-meta.xml', '');
                         fileName = fileName.substring(0, fileName.lastIndexOf('.'));
                    } else {
                         fileName = fileNameWithExt;
                    }
                    if (diff.mode === 'new file' || diff.mode === 'edit file') {
                         if (METADATA_XML_RELATION[metadataType.xmlName]) {
                              let possibleMetadataToAddOnDeploy = MetadataFactory.analizeDiffChanges(diff.addChanges, metadataForDeploy, metadataType, fileName, filePath);
                              let possibleMetadataToAddOnDelete = MetadataFactory.analizeDiffChanges(diff.removeChanges, metadataForDelete, metadataType, fileName, filePath);
                              if (possibleMetadataToAddOnDeploy) {
                                   metadataForDeploy = MetadataFactory.combineMetadata(metadataForDeploy, possibleMetadataToAddOnDeploy);
                              }
                              if (possibleMetadataToAddOnDelete) {
                                   metadataForDeploy = MetadataFactory.combineMetadata(metadataForDeploy, possibleMetadataToAddOnDelete);
                              }
                         } else {
                              let metadata = MetadataFactory.createMetadataType(metadataType.xmlName, true, typeFolder, metadataType.suffix);
                              let childs = MetadataFactory.getMetadataObjectsFromGitDiff(metadataType, baseFolderSplits, fileName, filePath);
                              if (!metadataForDeploy[metadata.name])
                                   metadataForDeploy[metadata.name] = metadata;
                              Object.keys(childs).forEach(function (childKey) {
                                   if (!metadataForDeploy[metadata.name].childs[childKey])
                                        metadataForDeploy[metadata.name].childs[childKey] = childs[childKey];
                                   if (childs[childKey].childs && Object.keys(childs[childKey].childs).length > 0) {
                                        Object.keys(childs[childKey].childs).forEach(function (grandChildKey) {
                                             if (!metadataForDeploy[metadata.name].childs[childKey].childs[grandChildKey])
                                                  metadataForDeploy[metadata.name].childs[childKey].childs[grandChildKey] = childs[childKey].childs[grandChildKey];
                                        });
                                   }
                              });
                         }
                    } else if (diff.mode === 'deleted file') {
                         if (METADATA_XML_RELATION[metadataType.xmlName]) {
                              let possibleMetadataToAddOnDelete = MetadataFactory.analizeDiffChanges(diff.removeChanges, metadataForDelete, metadataType, fileName, filePath);
                              if (possibleMetadataToAddOnDelete) {
                                   metadataForDelete = MetadataFactory.combineMetadata(metadataForDelete, possibleMetadataToAddOnDelete);
                              }
                         } else {
                              let metadata = MetadataFactory.createMetadataType(metadataType.xmlName, true, typeFolder, metadataType.suffix);
                              let childs = MetadataFactory.getMetadataObjectsFromGitDiff(metadataType, baseFolderSplits, fileName, filePath);
                              if ((metadataType.xmlName === MetadataTypes.AURA && !fileNameWithExt.endsWith('.cmp') && !fileNameWithExt.endsWith('.evt') && !fileNameWithExt.endsWith('.app'))
                                   || (metadataType.xmlName === MetadataTypes.LWC && !fileNameWithExt.endsWith('.html'))
                                   || metadataType.xmlName === MetadataTypes.STATIC_RESOURCE && !fileNameWithExt.endsWith('.resource-meta.xml')) {
                                   if (!metadataForDeploy[metadata.name])
                                        metadataForDeploy[metadata.name] = metadata;
                                   Object.keys(childs).forEach(function (childKey) {
                                        if (!metadataForDeploy[metadata.name].childs[childKey])
                                             metadataForDeploy[metadata.name].childs[childKey] = childs[childKey];
                                        if (childs[childKey].childs && Object.keys(childs[childKey].childs).length > 0) {
                                             Object.keys(childs[childKey].childs).forEach(function (grandChildKey) {
                                                  if (!metadataForDeploy[metadata.name].childs[childKey].childs[grandChildKey])
                                                       metadataForDeploy[metadata.name].childs[childKey].childs[grandChildKey] = childs[childKey].childs[grandChildKey];
                                             });
                                        }
                                   });
                              } else {
                                   if (!metadataForDelete[metadata.name])
                                        metadataForDelete[metadata.name] = metadata;
                                   Object.keys(childs).forEach(function (childKey) {
                                        if (!metadataForDelete[metadata.name].childs[childKey])
                                             metadataForDelete[metadata.name].childs[childKey] = childs[childKey];
                                        else if (childs[childKey].checked) {
                                             metadataForDelete[metadata.name].childs[childKey].checked = true;
                                        }
                                        if (childs[childKey].childs && Object.keys(childs[childKey].childs).length > 0) {
                                             Object.keys(childs[childKey].childs).forEach(function (grandChildKey) {
                                                  if (!metadataForDelete[metadata.name].childs[childKey].childs[grandChildKey])
                                                       metadataForDelete[metadata.name].childs[childKey].childs[grandChildKey] = childs[childKey].childs[grandChildKey];
                                             });
                                        }
                                   });
                              }
                         }
                    }
               }
          }
          let typesForPriorDelete = [
               MetadataTypes.LWC,
               MetadataTypes.WORKFLOW,
               MetadataTypes.AURA,
               MetadataTypes.STATIC_RESOURCE,
               MetadataTypes.APEX_CLASS,
               MetadataTypes.APEX_PAGE,
               MetadataTypes.APEX_TRIGGER,
               MetadataTypes.APEX_COMPONENT,
               MetadataTypes.EMAIL_TEMPLATE,
               MetadataTypes.DOCUMENT,
               MetadataTypes.REPORTS,
               MetadataTypes.DASHBOARD,
          ];
          MetadataFactory.priorMetadataTypes(typesForPriorDelete, metadataForDelete, metadataForDeploy);
          let typesForPriorDeploy = [
               MetadataTypes.CUSTOM_LABEL,
               MetadataTypes.CUSTOM_LABELS,
               MetadataTypes.WORKFLOW_FIELD_UPDATE,
               MetadataTypes.WORKFLOW_OUTBOUND_MESSAGE,
               MetadataTypes.WORKFLOW_TASK,
               MetadataTypes.WORKFLOW_RULE,
               MetadataTypes.WORKFLOW_ALERT,
               MetadataTypes.SHARING_CRITERIA_RULE,
               MetadataTypes.SHARING_OWNER_RULE,
               MetadataTypes.SHARING_GUEST_RULE,
               MetadataTypes.SHARING_TERRITORY_RULE
          ];
          MetadataFactory.priorMetadataTypes(typesForPriorDeploy, metadataForDeploy, metadataForDelete);
          metadataForDeploy = Utils.orderMetadata(metadataForDeploy);
          metadataForDelete = Utils.orderMetadata(metadataForDelete);
          return {
               metadataForDeploy: metadataForDeploy,
               metadataForDelete: metadataForDelete
          }
     }

     static getMetadataObjectsFromGitDiff(metadataType, baseFolderSplits, fileName, filePath) {
          let especialTypes = [MetadataTypes.CUSTOM_METADATA, MetadataTypes.APPROVAL_PROCESSES, MetadataTypes.DUPLICATE_RULE,
          MetadataTypes.QUICK_ACTION, MetadataTypes.LAYOUT, MetadataTypes.AURA, MetadataTypes.LWC, MetadataTypes.ASSIGNMENT_RULES, MetadataTypes.AUTORESPONSE_RULES,
          MetadataTypes.WORKFLOW, MetadataTypes.CUSTOM_LABELS, MetadataTypes.SHARING_RULE, MetadataTypes.FLOWS, MetadataTypes.CUSTOM_OBJECT_TRANSLATIONS, MetadataTypes.STATIC_RESOURCE];
          let objects = {};
          let fistPartBaseFolder = baseFolderSplits[0];
          let folderPath = Paths.getFolderPath(filePath);
          if (baseFolderSplits.length > 1 && !especialTypes.includes(metadataType.xmlName)) {
               let metadataObjectFolderName = baseFolderSplits[1];
               if (fileName.indexOf('Folder-meta.xml') === -1) {
                    if (metadataType.xmlName === MetadataTypes.DOCUMENT) {
                         if (fileName.indexOf('-meta.xml') === -1) {
                              if (!objects[metadataObjectFolderName])
                                   objects[metadataObjectFolderName] = MetadataFactory.createMetadataObject(metadataObjectFolderName, false, filePath);
                              if (fistPartBaseFolder === 'objects' && baseFolderSplits.length > 2) {
                                   objects[metadataObjectFolderName].path = folderPath;
                                   objects[metadataObjectFolderName].childs[fileName] = MetadataFactory.createMetadataItem(fileName, true, filePath);
                              } else if (baseFolderSplits.length > 1) {
                                   objects[metadataObjectFolderName].path = folderPath;
                                   objects[metadataObjectFolderName].childs[fileName] = MetadataFactory.createMetadataItem(fileName, true, filePath);
                              } else {
                                   objects[metadataObjectFolderName].checked = true;
                              }
                         }
                    } else {
                         if (!objects[metadataObjectFolderName])
                              objects[metadataObjectFolderName] = MetadataFactory.createMetadataObject(metadataObjectFolderName, false, filePath);
                         if (metadataType.xmlName !== MetadataTypes.CUSTOM_OBJECT) {
                              if (fistPartBaseFolder === 'objects' && baseFolderSplits.length > 2) {
                                   objects[metadataObjectFolderName].path = folderPath;
                                   objects[metadataObjectFolderName].childs[fileName] = MetadataFactory.createMetadataItem(fileName, true, filePath);
                              } else if (baseFolderSplits.length > 1) {
                                   objects[metadataObjectFolderName].path = folderPath;
                                   objects[metadataObjectFolderName].childs[fileName] = MetadataFactory.createMetadataItem(fileName, true, filePath);
                              } else {
                                   objects[metadataObjectFolderName].checked = true;
                              }
                         } else {
                              objects[metadataObjectFolderName].checked = true;
                         }
                    }
               } else {
                    fileName = StrUtils.replace(fileName, '-meta.xml', '');
                    fileName = fileName.substring(0, fileName.lastIndexOf('.'));
                    if (!objects[fileName])
                         objects[fileName] = MetadataFactory.createMetadataObject(fileName, true, folderPath);
                    else
                         objects[fileName].checked = true;
               }
          } else if (metadataType.xmlName === MetadataTypes.CUSTOM_METADATA || metadataType.xmlName === MetadataTypes.APPROVAL_PROCESSES || metadataType.xmlName === MetadataTypes.DUPLICATE_RULE || metadataType.xmlName === MetadataTypes.QUICK_ACTION) {
               let fileNameParts = fileName.split('.');
               let sobj = fileNameParts[0].trim();
               let item = fileNameParts[1].trim();
               if (!objects[sobj])
                    objects[sobj] = MetadataFactory.createMetadataObject(sobj, true, folderPath);
               if (!objects[sobj].childs[item])
                    objects[sobj].childs[item] = MetadataFactory.createMetadataItem(item, true, filePath);
          } else if (metadataType.xmlName === MetadataTypes.LAYOUT || metadataType.xmlName === MetadataTypes.STANDARD_VALUE_SET_TRANSLATION) {
               let sobj = fileName.substring(0, fileName.indexOf('-')).trim();
               let item = fileName.substring(fileName.indexOf('-') + 1).trim();
               if (!objects[sobj])
                    objects[sobj] = MetadataFactory.createMetadataObject(sobj, true, folderPath);
               if (!objects[sobj].childs[item])
                    objects[sobj].childs[item] = MetadataFactory.createMetadataItem(item, true, filePath);
          } else if (metadataType.xmlName === MetadataTypes.CUSTOM_OBJECT_TRANSLATIONS) {
               let folderName = baseFolderSplits[0];
               let sobj = folderName.substring(0, folderName.indexOf('-')).trim();
               let item = folderName.substring(folderName.indexOf('-') + 1).trim();
               let lastFolder = Paths.getFolderPath(folderPath);
               if (!objects[sobj])
                    objects[sobj] = MetadataFactory.createMetadataObject(sobj, true, lastFolder);
               if (!objects[sobj].childs[item])
                    objects[sobj].childs[item] = MetadataFactory.createMetadataItem(item, true, folderPath);
          } else if (metadataType.xmlName === MetadataTypes.STATIC_RESOURCE) {
               let resourcePath = filePath.substring(0, filePath.indexOf('/' + metadataType.directoryName));
               resourcePath = resourcePath + '/' + metadataType.directoryName + '/' + baseFolderSplits[1 + '.' + metadataType.suffix + '-meta.xml'];
               if (baseFolderSplits.length === 1) {
                    if (!objects[fileName])
                         objects[fileName] = MetadataFactory.createMetadataObject(fileName, true, resourcePath);
               } else {
                    if (!objects[baseFolderSplits[1]])
                         objects[baseFolderSplits[1]] = MetadataFactory.createMetadataObject(baseFolderSplits[1], true, resourcePath);
               }
          } else if (metadataType.xmlName === MetadataTypes.FLOW) {
               if (fileName.indexOf('-') !== -1) {
                    let sobj = fileName.substring(0, fileName.indexOf('-')).trim();
                    let item = fileName.substring(fileName.indexOf('-') + 1).trim();
                    if (!objects[sobj])
                         objects[sobj] = MetadataFactory.createMetadataObject(sobj, true, folderPath);
                    if (!objects[sobj].childs[item])
                         objects[sobj].childs[item] = MetadataFactory.createMetadataItem(item, true, filePath);
               } else {
                    if (!objects[fileName])
                         objects[fileName] = MetadataFactory.createMetadataObject(fileName, true, filePath);
               }
          } else if (metadataType.xmlName === MetadataTypes.AURA || metadataType.xmlName === MetadataTypes.LWC) {
               if (baseFolderSplits[1] && !objects[baseFolderSplits[1]])
                    objects[baseFolderSplits[1]] = MetadataFactory.createMetadataObject(baseFolderSplits[1], true, folderPath);
          } else {
               if (fileName.indexOf('Folder-meta.xml') !== -1) {
                    fileName = StrUtils.replace(fileName, '-meta.xml', '');
                    fileName = fileName.substring(0, fileName.lastIndexOf('.'));
                    if (!objects[fileName])
                         objects[fileName] = MetadataFactory.createMetadataObject(fileName, true, filePath);
                    else
                         objects[fileName].checked = true;
               } else {
                    if (!objects[fileName])
                         objects[fileName] = MetadataFactory.createMetadataObject(fileName, true, filePath);
               }
          }
          return objects;
     }

     static analizeDiffChanges(diffChanges, metadata, metadataType, fileName, filePath) {
          let added = true;
          let possibleMetadataToAdd;
          let typePath = filePath.substring(0, filePath.indexOf('/' + metadataType.directoryName));
          typePath = typePath + '/' + metadataType.directoryName;
          if (diffChanges.length > 0) {
               added = false;
               let startCollectionTag;
               let endCollectionTag;
               let onMember = false;
               let fullNameContent = '';
               let collectionData;
               for (let changedLine of diffChanges) {
                    changedLine = StrUtils.replace(changedLine, ',', '');
                    if (!startCollectionTag) {
                         startCollectionTag = MetadataFactory.getChildTypeStartTag(metadataType.xmlName, changedLine);
                    }
                    if (startCollectionTag) {
                         collectionData = METADATA_XML_RELATION[metadataType.xmlName][startCollectionTag];
                         let startNameTag = XMLParser.startTag(changedLine, collectionData.fieldKey);
                         let endNameTag = XMLParser.endTag(changedLine, collectionData.fieldKey);
                         if (startNameTag !== undefined && endNameTag !== undefined) {
                              let startTagIndex = changedLine.indexOf('<' + startNameTag + '>');
                              let endTagIndex = changedLine.indexOf('</' + endNameTag + '>');
                              fullNameContent = changedLine.substring(startTagIndex, endTagIndex);
                              fullNameContent = fullNameContent.substring(fullNameContent.indexOf('>') + 1);
                         }
                         else if (startNameTag !== undefined) {
                              onMember = true;
                              fullNameContent += changedLine;
                         } else if (onMember) {
                              fullNameContent += changedLine;
                         } else if (endNameTag !== undefined) {
                              onMember = false;
                              fullNameContent += changedLine;
                         }
                    }
                    if (startCollectionTag && !endCollectionTag)
                         endCollectionTag = XMLParser.endTag(changedLine, startCollectionTag);
                    if (endCollectionTag) {
                         if (!collectionData)
                              collectionData = METADATA_XML_RELATION[metadataType.xmlName][endCollectionTag];
                         fullNameContent = StrUtils.replace(fullNameContent, ',', '').trim();
                         if (fullNameContent.length > 0) {
                              let type = collectionData.type;
                              if (!metadata[type])
                                   metadata[type] = MetadataFactory.createMetadataType(type, true, typePath, metadataType.suffix);
                              if (metadataType.xmlName === MetadataTypes.CUSTOM_LABELS) {
                                   if (!metadata[type].childs[fullNameContent])
                                        metadata[type].childs[fullNameContent] = MetadataFactory.createMetadataObject(fullNameContent, true, filePath);
                              } else {
                                   if (!metadata[type].childs[fileName])
                                        metadata[type].childs[fileName] = MetadataFactory.createMetadataObject(fileName, true, filePath);
                                   metadata[type].childs[fileName].childs[fullNameContent] = MetadataFactory.createMetadataItem(fullNameContent, true, filePath);
                              }
                              added = true;
                              fullNameContent = '';
                         }
                         startCollectionTag = undefined;
                         endCollectionTag = undefined;
                    }
               }
          }
          if (!added) {
               possibleMetadataToAdd = {};
               possibleMetadataToAdd[metadataType.xmlName] = MetadataFactory.createMetadataType(metadataType.xmlName, true, typePath, metadataType.suffix);
               if (!possibleMetadataToAdd[metadataType.xmlName].childs[fileName])
                    possibleMetadataToAdd[metadataType.xmlName].childs[fileName] = MetadataFactory.createMetadataObject(fileName, true, filePath);
          }
          return possibleMetadataToAdd;
     }

     static getChildTypeStartTag(metadataType, content) {
          let tag;
          let xmlKeys = Object.keys(METADATA_XML_RELATION[metadataType]);
          for (const xmlKey of xmlKeys) {
               tag = XMLParser.startTag(StrUtils.replace(content, ',', ''), xmlKey);
               if (tag) {
                    break;
               }
          }
          return tag;
     }

     static priorMetadataTypes(types, metadataToPrior, metadataToRemove) {
          for (const type of types) {
               if (metadataToPrior[type]) {
                    Object.keys(metadataToPrior[type].childs).forEach(function (childKey) {
                         if (metadataToPrior[type].childs[childKey].childs && Object.keys(metadataToPrior[type].childs[childKey].childs).length > 0) {
                              if (metadataToRemove[type] && metadataToRemove[type].childs[childKey] && metadataToRemove[type].childs[childKey].checked) {
                                   metadataToRemove[type].childs[childKey].checked = false;
                              }
                              Object.keys(metadataToPrior[type].childs[childKey].childs).forEach(function (grandChildKey) {
                                   if (metadataToRemove[type] && metadataToRemove[type].childs[childKey] && metadataToRemove[type].childs[childKey].childs[grandChildKey] && metadataToRemove[type].childs[childKey].childs[grandChildKey].checked) {
                                        metadataToRemove[type].childs[childKey].childs[grandChildKey].checked = false;
                                   }
                              });
                         } else {
                              if (metadataToRemove[type] && metadataToRemove[type].childs[childKey] && metadataToRemove[type].childs[childKey].checked) {
                                   metadataToRemove[type].childs[childKey].checked = false;
                              }
                         }
                    });
               }
          }
     }

     static combineMetadata(metadataTarget, metadataSource) {
          Object.keys(metadataSource).forEach(function (key) {
               const metadataTypeSource = metadataSource[key];
               const metadataTypeTarget = metadataTarget[key];
               if (metadataTypeTarget) {
                    const childKeys = Object.keys(metadataTypeSource.childs);
                    if (childKeys.length > 0) {
                         Object.keys(metadataTypeSource.childs).forEach(function (childKey) {
                              const metadataObjectSource = metadataTypeSource.childs[childKey];
                              const metadataObjectTarget = metadataTypeTarget.childs[childKey];
                              if (metadataObjectTarget) {
                                   const grandChildKeys = Object.keys(metadataObjectSource.childs);
                                   if (grandChildKeys.length > 0) {
                                        Object.keys(metadataObjectSource.childs).forEach(function (grandChildKey) {
                                             const metadataItemSource = metadataObjectSource.childs[grandChildKey];
                                             const metadataItemTarget = metadataObjectTarget.childs[grandChildKey];
                                             if (metadataItemTarget && metadataItemSource.checked) {
                                                  metadataTarget[key].childs[childKey].childs[grandChildKey].checked = true;
                                             } else {
                                                  metadataTarget[key].childs[childKey].childs[grandChildKey] = metadataItemSource;
                                             }
                                        });
                                        metadataTarget[key].childs[childKey].checked = Utils.isAllChecked(metadataTarget[key].childs[childKey].childs);
                                   } else {
                                        metadataTarget[key].childs[childKey].checked = metadataObjectSource.checked;
                                   }
                              } else {
                                   metadataTarget[key].childs[childKey] = metadataObjectSource;
                              }
                         });
                         metadataTarget[key].checked = Utils.isAllChecked(metadataTarget[key].childs);
                    } else {
                         metadataTarget[key].checked = metadataTypeSource.checked;
                    }
               } else {
                    metadataTarget[key] = metadataSource[key];
               }
          });
          return metadataTarget;
     }

     static createIgnoreMap(objectsForIgnore) {
          let objectToIgnoreMap = {};
          for (let objectToIgnore of objectsForIgnore) {
               if (objectToIgnore.indexOf(':') !== -1) {
                    let splits = objectToIgnore.split(':');
                    if (splits.length === 2) {
                         if (!objectToIgnoreMap[splits[0]])
                              objectToIgnoreMap[splits[0]] = [];
                         objectToIgnoreMap[splits[0]].push(splits[1]);
                    } else if (splits.length === 3 && splits[0].toLowerCase() === 'userpermission') {
                         if (!objectToIgnoreMap[splits[1]])
                              objectToIgnoreMap[splits[1]] = [];
                         objectToIgnoreMap[splits[1]].push({ permission: splits[2] });
                    }
               } else {
                    objectToIgnoreMap[objectToIgnore] = [objectToIgnore];
               }
          }
          return objectToIgnoreMap;
     }
}
module.exports = MetadataFactory;