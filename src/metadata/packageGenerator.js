const MetadataTypes = require('./metadataTypes');
const MetadataUtils = require('./utils');
const MetadataFactory = require('./factory');
const fileSystem = require('../fileSystem');
const languages = require('../languages');
const FileChecker = fileSystem.FileChecker;
const Paths = fileSystem.Paths;
const FileReader = fileSystem.FileReader;
const FileWriter = fileSystem.FileWriter;
const XMLParser = languages.XMLParser;


const START_XML_FILE = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
const PACKAGE_TAG_START = "<Package xmlns=\"http://soap.sforce.com/2006/04/metadata\">";
const PACKAGE_TAG_END = "</Package>";
const VERSION_TAG_START = "<version>";
const VERSION_TAG_END = "</version>";
const TYPES_TAG_START = "<types>";
const TYPES_TAG_END = "</types>";
const NAME_TAG_START = "<name>";
const NAME_TAG_END = "</name>";
const MEMBERS_TAG_START = "<members>";
const MEMBERS_TAG_END = "</members>";

const NOT_ALLOWED_WILDCARDS = [

];

class PackageGenerator {

    static transformPackageToMetadataFormat(pkg) {
        Object.keys(pkg).forEach(function (type) {
            if (metadata[type]) {
                if (pkg[type].includes('*')) {
                    metadata[type].checked = true;
                    checkAll(metadata[type].childs, type);
                } else {
                    for (let member of pkg[type]) {
                        let separator;
                        if (type === MetadataTypes.EMAIL_TEMPLATE || type === MetadataTypes.DOCUMENT || type === MetadataTypes.REPORTS || type === MetadataTypes.DASHBOARD) {
                            separator = '/';
                        } else if (type === MetadataTypes.LAYOUT || type === MetadataTypes.CUSTOM_OBJECT_TRANSLATIONS || type === MetadataTypes.FLOWS) {
                            separator = '-';
                        } else {
                            separator = '.';
                        }
                        if (member.indexOf(separator) != -1) {
                            let object = member.substring(0, member.indexOf(separator));
                            let item = member.substring(member.indexOf(separator) + 1);
                            if (metadata[type].childs[object] && metadata[type].childs[object].childs[item]) {
                                metadata[type].childs[object].childs[item].checked = true;
                                metadata[type].childs[object].checked = isAllChecked(metadata[type].childs[object].childs);
                            }
                        } else {
                            if (metadata[type].childs[member])
                                metadata[type].childs[member].checked = true;
                        }
                    }
                    metadata[type].checked = isAllChecked(metadata[type].childs);
                }
            }
        });
        return metadata;
    }

    static mergePackages(packagePaths, apiVersion) {
        let result;
        for (const packagePath of packagePaths) {
            let pkg = XMLParser.parseXML(FileReader.readFileSync(packagePath));
            let preparedPkg = PackageGenerator.createPackageFromXMLPackage(pkg, apiVersion);
            if (!result)
                result = preparedPkg;
            else
                result = PackageGenerator.mergePackage(result, preparedPkg);
        }
        return PackageGenerator.transformPackageToMetadataFormat(result);
    }

    static createPackageFromXMLPackage(pkg, apiVersion) {
        let result;
        if (pkg.Package) {
            result = {
                version: apiVersion
            };
            let types = [];
            if (Array.isArray(pkg.Package.types))
                types = pkg.Package.types;
            else
                types.push(pkg.Package.types);
            for (const type of types) {
                if (!result[type.name])
                    result[type.name] = [];
                let members = [];
                if (Array.isArray(type.members))
                    members = type.members;
                else
                    members.push(type.members);
                for (const member of members) {
                    result[type.name].push(member);
                }
            }
        }
        return result;
    }

    static mergePackage(target, source) {
        Object.keys(target).forEach(function (key) {
            if (key !== 'version') {
                if (source[key]) {
                    for (const sourceMember of source[key]) {
                        if (!target[key].includes(sourceMember))
                            target[key].push(sourceMember);
                    }
                }
                target[key] = target[key].sort();
            }
        });
        return target
    }

    static createPackageFromMerged(pkg) {
        let pkgLines = [];
        pkgLines.push(START_XML_FILE);
        pkgLines.push(PACKAGE_TAG_START);
        Object.keys(pkg).forEach(function (key) {
            if (key !== 'version') {
                pkgLines.push('\t' + TYPES_TAG_START);
                for (const member of pkg[key]) {
                    pkgLines.push('\t\t' + MEMBERS_TAG_START + member + MEMBERS_TAG_END);
                }
                pkgLines.push('\t\t' + NAME_TAG_START + key + NAME_TAG_END);
                pkgLines.push('\t' + TYPES_TAG_END);
            }
        });
        pkgLines.push('\t' + VERSION_TAG_START + pkg.version + '.0' + VERSION_TAG_END);
        pkgLines.push(PACKAGE_TAG_END);
        return pkgLines.join('\n');
    }

    static validateJSON(metadata) {
        if (Array.isArray(metadata))
            throw new Error("Wrong JSON Format file. The main object must be a JSON Object not an Array");
        if (typeof metadata !== 'object')
            throw new Error("Wrong JSON Format file. The main object must be a JSON Object not a " + typeof metadata);
        Object.keys(metadata).forEach(function (key) {
            let metadataType = metadata[key];
            PackageGenerator.validateMetadataType(metadataType, key);
            if (metadataType.childs && Object.keys(metadataType.childs).length > 0) {
                Object.keys(metadataType.childs).forEach(function (childKey) {
                    let metadataObject = metadataType.childs[childKey];
                    PackageGenerator.validateMetadataObject(metadataObject, childKey);
                    if (metadataObject.childs && Object.keys(metadataObject.childs).length > 0) {
                        Object.keys(metadataObject.childs).forEach(function (grandChildKey) {
                            let metadataItem = metadataObject.childs[grandChildKey];
                            PackageGenerator.validateMetadataItem(metadataItem, grandChildKey);
                        });
                    }
                });
            }
        });
    }

    static validateMetadataType(metadataType, key) {
        if (metadataType.name === undefined)
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". Missing name field");
        if (metadataType.checked === undefined)
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". Missing checked field");
        if (metadataType.childs === undefined)
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". Missing childs field");
        if (Array.isArray(metadataType.childs))
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". childs field must be a JSON Object, not an Array");
        if (typeof metadataType.childs !== 'object')
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". childs field must be a JSON Object, not a " + typeof metadataType.childs);
    }

    static validateMetadataObject(metadataObject, key) {
        if (metadataObject.name === undefined)
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". Missing name field");
        if (metadataObject.checked === undefined)
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". Missing checked field");
        if (metadataObject.childs === undefined)
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". Missing childs field");
        if (Array.isArray(metadataObject.childs))
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". childs field must be a JSON Object, not an Array");
        if (typeof metadataObject.childs !== 'object')
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". childs field must be a JSON Object, not a " + typeof metadataObject.childs);
    }

    static validateMetadataItem(metadataItem, key) {
        if (metadataItem.name === undefined)
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". Missing name field");
        if (metadataItem.checked === undefined)
            throw new Error("Wrong JSON Format for Metadata Type with key " + key + ". Missing checked field");
    }

    static createPackage(metadata, version, explicit) {
        explicit = (explicit != undefined) ? explicit : true;
        let packageContent = [];
        packageContent.push(START_XML_FILE);
        packageContent.push(PACKAGE_TAG_START);
        Object.keys(metadata).forEach(function (key) {
            let typesBlock = PackageGenerator.makeTypesBlock(metadata[key], metadata[key].childs, explicit);
            if (typesBlock)
                packageContent.push(typesBlock);
        });
        packageContent.push('\t' + VERSION_TAG_START + version + VERSION_TAG_END);
        packageContent.push(PACKAGE_TAG_END);
        return packageContent.join('\n');
    }

    static makeTypesBlock(metadataType, childs, explicit) {
        let typesBlockContent = [];
        let addBlock = false;
        if (!childs || Object.keys(childs).length === 0)
            return '';
        typesBlockContent.push('\t' + TYPES_TAG_START);
        if (!explicit && metadataType.checked && MetadataUtils.isAllChecked(metadataType.childs) && !NOT_ALLOWED_WILDCARDS[metadataType.name]) {
            typesBlockContent.push('\t\t' + MEMBERS_TAG_START + '*' + MEMBERS_TAG_END);
            addBlock = true;
        } else if (explicit) {
            let folderAdded = false;
            Object.keys(childs).forEach(function (key) {
                let mtObject = childs[key];
                if (mtObject.childs && Object.keys(mtObject.childs).length > 0) {
                    if (!folderAdded && mtObject.checked && (metadataType.name === MetadataTypes.DOCUMENT || metadataType.name === MetadataTypes.EMAIL_TEMPLATE || metadataType.name === MetadataTypes.REPORTS || metadataType.name === MetadataTypes.DASHBOARD)) {
                        typesBlockContent.push('\t\t' + MEMBERS_TAG_START + mtObject.name + MEMBERS_TAG_END);
                        addBlock = true;
                        folderAdded = true;
                    }
                    Object.keys(mtObject.childs).forEach(function (key) {
                        let mtItem = mtObject.childs[key];
                        let separator;
                        if (metadataType.name === MetadataTypes.EMAIL_TEMPLATE || metadataType.name === MetadataTypes.DOCUMENT || metadataType.name === MetadataTypes.REPORTS || metadataType.name === MetadataTypes.DASHBOARD) {
                            separator = '/';
                        } else if (metadataType.name === MetadataTypes.LAYOUT || metadataType.name === MetadataTypes.CUSTOM_OBJECT_TRANSLATIONS || metadataType.name === MetadataTypes.FLOWS) {
                            separator = '-';
                        } else {
                            separator = '.';
                        }
                        if (mtItem.checked) {
                            typesBlockContent.push('\t\t' + MEMBERS_TAG_START + mtObject.name + separator + mtItem.name + MEMBERS_TAG_END);
                            addBlock = true;
                        }
                    });
                } else if (mtObject.checked) {
                    typesBlockContent.push('\t\t' + MEMBERS_TAG_START + mtObject.name + MEMBERS_TAG_END);
                    addBlock = true;
                }
            });
        }
        typesBlockContent.push('\t\t' + NAME_TAG_START + metadataType.name + NAME_TAG_END);
        typesBlockContent.push('\t' + TYPES_TAG_END);
        if (addBlock) {
            return typesBlockContent.join('\n');
        }
        else
            return undefined;
    }

    static getFolders(childs) {
        let folders = [];
        Object.keys(childs).forEach(function (key) {
            if (childs[key].name.indexOf('/') != -1 && childs[key].name.indexOf('unfiled$public') == -1) {
                let folderName = childs[key].name.substring(0, childs[key].name.indexOf('/'));
                if (!folders.includes(folderName))
                    folders.push(folderName);
            }
        });
        return folders;
    }
}
module.exports = PackageGenerator;