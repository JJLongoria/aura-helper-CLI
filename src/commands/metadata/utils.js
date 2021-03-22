const { MetadataTypes } = require('@ah/core').Values;

let speciaObjects;

class Utils {

    static getSpecialMetadata() {
        if (!speciaObjects) {
            speciaObjects = {};
            speciaObjects[MetadataTypes.PROFILE] = [
                MetadataTypes.CUSTOM_APPLICATION,
                MetadataTypes.APEX_CLASS,
                MetadataTypes.APEX_PAGE,
                MetadataTypes.CUSTOM_METADATA,
                MetadataTypes.CUSTOM_OBJECT,
                MetadataTypes.CUSTOM_FIELD,
                MetadataTypes.CUSTOM_PERMISSION,
                MetadataTypes.CUSTOM_TAB,
                MetadataTypes.LAYOUT,
                MetadataTypes.FLOW,
                MetadataTypes.RECORD_TYPE,
                MetadataTypes.EXTERNAL_DATA_SOURCE,
                MetadataTypes.DATA_CATEGORY_GROUP,
            ];
            speciaObjects[MetadataTypes.PERMISSION_SET] = [
                MetadataTypes.CUSTOM_APPLICATION,
                MetadataTypes.APEX_CLASS,
                MetadataTypes.APEX_PAGE,
                MetadataTypes.CUSTOM_METADATA,
                MetadataTypes.CUSTOM_OBJECT,
                MetadataTypes.CUSTOM_FIELD,
                MetadataTypes.CUSTOM_PERMISSION,
                MetadataTypes.CUSTOM_TAB,
                MetadataTypes.RECORD_TYPE
            ];
            speciaObjects[MetadataTypes.TRANSLATIONS] = [
                MetadataTypes.CUSTOM_APPLICATION,
                MetadataTypes.CUSTOM_LABEL,
                MetadataTypes.CUSTOM_TAB,
                MetadataTypes.FLOW,
                MetadataTypes.FLOW_DEFINITION,
                MetadataTypes.CUSTOM_OBJECT,
                MetadataTypes.CUSTOM_FIELD,
                MetadataTypes.QUICK_ACTION,
                MetadataTypes.REPORT_TYPE,
                MetadataTypes.CUSTOM_PAGE_WEB_LINK,
                MetadataTypes.S_CONTROL
            ];
            speciaObjects[MetadataTypes.RECORD_TYPE] = [
                MetadataTypes.COMPACT_LAYOUT,
                MetadataTypes.CUSTOM_FIELD,
                MetadataTypes.BUSINESS_PROCESS
            ];
            speciaObjects[MetadataTypes.CUSTOM_OBJECT] = [];
        }
        return speciaObjects;
    }

    static getTypes(type) {
        let types = [];
        let typesTmp = [type];
        if (type.indexOf(',') !== -1)
            typesTmp = type.split(',');
        else if (type.indexOf(' ') !== -1)
            typesTmp = type.split(' ');
        for (const typeTmp of typesTmp) {
            types.push(typeTmp.trim());
        }
        return types;
    }

    static getAdvanceTypes(type) {
        let types = {};
        let typesTmp = [type];
        if (type.indexOf(',') !== -1)
            typesTmp = type.split(',');
        else if (type.indexOf(' ') !== -1)
            typesTmp = type.split(' ');
        for (const typeTmp of typesTmp) {
            if (typeTmp.indexOf(':') !== -1) {
                let splits = typeTmp.split(':');
                if (splits.length === 2) {
                    let metadataType = splits[0].trim();
                    let metadataObject = splits[1].trim();
                    if (!types[metadataType])
                        types[metadataType] = {};
                    if (!types[metadataType][metadataObject])
                        types[metadataType][metadataObject] = ['*'];
                } else if (splits.length === 3) {
                    let metadataType = splits[0].trim();
                    let metadataObject = splits[1].trim();
                    let metadataItem = splits[2].trim();
                    if (!types[metadataType])
                        types[metadataType] = {};
                    if (!types[metadataType][metadataObject])
                        types[metadataType][metadataObject] = [];
                    if (!types[metadataType][metadataObject].includes(metadataItem))
                        types[metadataType][metadataObject].push(metadataItem);
                }
            } else {
                let metadataType = typeTmp.trim();
                types[metadataType] = {};
                types[metadataType]['*'] = ['*'];
            }
        }
        return types;
    }
}
module.exports = Utils;