const Utils = require('./utils');
const MetadataTypes = require('./metadataTypes');
const XMLParser = require('../languages').XMLParser;

const XML_METADATA = {
    fullName: {
        key: "fullName",
        label: "Full Name",
        editable: false,
        datatype: 'string',
        minApi: 1,
        maxApi: -1,
    },
    labels: {
        key: "labels",
        label: "Labels",
        editable: true,
        datatype: 'array',
        minApi: 1,
        maxApi: -1,
        metadataType: MetadataTypes.CUSTOM_LABEL,
        xmlData: {
            fieldKey: "fullName",
            sortOrder: ["fullName"],
            fields: {
                categories: {
                    datatype: "string",
                    unique: false,
                    editable: true,
                    default: '{!value}',
                },
                fullName: {
                    datatype: "string",
                    unique: true,
                    editable: true,
                    default: '{!value}',
                },
                language: {
                    datatype: "string",
                    unique: false,
                    editable: true,
                    default: '{!value}',
                },
                protected: {
                    datatype: "boolean",
                    unique: false,
                    editable: true,
                    default: false,
                },
                shortDescription: {
                    datatype: "string",
                    unique: false,
                    editable: true,
                    default: '{!value}',
                },
                value: {
                    datatype: "string",
                    unique: false,
                    editable: true,
                    default: '{!value}',
                }
            }
        }
    }
}

class CustomLabelsUtils {

    static createCustomLabels(customLabels) {
        let result = {};
        if (customLabels) {
            result = CustomLabelsUtils.createCustomLabels();
            result = Utils.prepareXML(customLabels, result);
            Object.keys(result).forEach(function (elementKey) {
                if (Array.isArray(result[elementKey])) {
                    let elementData = XML_METADATA[elementKey];
                    Utils.sort(result[elementKey], elementData.xmlData.sortOrder);
                }
            });
        } else {
            result = Utils.createXMLFile(XML_METADATA);
        }
        return result;
    }

    static createCustomLabel(categories, fullName, language, isProtected, shortDescription, value) {
        return {
            categories: categories,
            fullName: fullName,
            language: language,
            protected: isProtected,
            shortDescription: shortDescription,
            value: value
        }
    }

    static toXML(customLabels, compress) {
        let xmlLines = [];
        if (customLabels) {
            if (compress) {
                xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
                xmlLines.push('<CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">');
                if (customLabels.fullName !== undefined)
                    xmlLines.push(Utils.getTabs(1) + Utils.getXMLTag('fullName', customLabels.fullName));
                if (customLabels.labels !== undefined) {
                    xmlLines = xmlLines.concat(Utils.getXMLBlock('labels', customLabels.labels, true, 1));
                }
                xmlLines.push('</CustomLabels>');
            } else {
                return XMLParser.toXML(customLabels);
            }
        }
        return xmlLines.join('\n');
    }

}
module.exports = CustomLabelsUtils;