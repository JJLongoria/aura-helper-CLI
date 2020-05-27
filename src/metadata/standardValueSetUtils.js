const Utils = require('./utils');
const XMLParser = require('../languages').XMLParser;

class StandardValueSetUtils {

    static createStandardValueSet(standardValueSet) {
        let newStandardValueSet;
        if (standardValueSet) {
            newStandardValueSet = Utils.prepareXML(standardValueSet, StandardValueSetUtils.createStandardValueSet());
        } else {
            newStandardValueSet = {
                fullName: undefined,
                groupingStringEnum: undefined,
                sorted: false,
                standardValue: [],
            };
        }
        return newStandardValueSet;
    }

    static createStandardValue() {
        return {
            color: undefined,
            default: false,
            description: undefined,
            isActive: false,
            label: undefined
        }
    }

    static toXML(standardValueSet, compress) {
        let xmlLines = [];
        if (standardValueSet) {
            if (compress) {
                xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
                xmlLines.push('<StandardValueSet xmlns="http://soap.sforce.com/2006/04/metadata">');
                if (standardValueSet.fullName !== undefined)
                    xmlLines.push(Utils.getTabs(1) + Utils.getXMLTag('fullName', standardValueSet.fullName));
                if (standardValueSet.groupingStringEnum !== undefined)
                    xmlLines.push(Utils.getTabs(1) + Utils.getXMLTag('groupingStringEnum', standardValueSet.groupingStringEnum));
                if (standardValueSet.sorted !== undefined)
                    xmlLines.push(Utils.getTabs(1) + Utils.getXMLTag('sorted', standardValueSet.sorted));
                if (standardValueSet.standardValue !== undefined)
                    xmlLines = xmlLines.concat(Utils.getXMLBlock('standardValue', standardValueSet.standardValue, true, 1));
                xmlLines.push('</StandardValueSet>');
            } else {
                return XMLParser.toXML(standardValueSet);
            }
        }
        return xmlLines.join('\n');
    }

}
module.exports = StandardValueSetUtils;