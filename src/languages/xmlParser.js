const utils = require('./utils').Utils;
const parser = require('fast-xml-parser');
var he = require('he');

class XMLParser {

    static getParserXMLToJSONOptions() {
        return {
            attributeNamePrefix: "",
            attrNodeName: "@attr", //default is 'false'
            textNodeName: "#text",
            ignoreAttributes: false,
            ignoreNameSpace: false,
            allowBooleanAttributes: true,
            parseNodeValue: true,
            parseAttributeValue: false,
            trimValues: true,
            cdataTagName: "__cdata", //default is 'false'
            cdataPositionChar: "\\c",
            localeRange: "", //To support non english character in tag/attribute values.
            parseTrueNumberOnly: false,
            arrayMode: false, //"strict"
            attrValueProcessor: (val, attrName) => he.decode(val, { isAttributeValue: true }),//default is a=>a
            tagValueProcessor: (val, tagName) => he.decode(val), //default is a=>a
            stopNodes: ["parse-me-as-string"]
        };
    }

    static getParserJSONToXMLOptions() {
        return {
            attributeNamePrefix: "",
            attrNodeName: "@attr", //default is false
            textNodeName: "#text",
            ignoreAttributes: false,
            cdataTagName: "__cdata", //default is false
            cdataPositionChar: "\\c",
            format: true,
            indentBy: "\t",
            supressEmptyNode: false,
            tagValueProcessor: a => he.encode(a, { useNamedReferences: true }),// default is a=>a
            attrValueProcessor: a => he.encode(a, { useNamedReferences: true })// default is a=>a
        };
    }

    static parseXML(content, parseComments) {
        if (content && content.length > 0) {
            if (parseComments) {
                content = content.split('<!--').join('«!--');
                content = content.split('-->').join('--»');
            }
            return parser.parse(content, XMLParser.getParserXMLToJSONOptions());
        }
        return {};

    }

    static toXML(jsonObj) {
        jsonObj = XMLParser.fixObjValues(jsonObj);
        let xmlParser = new parser.j2xParser(XMLParser.getParserJSONToXMLOptions());
        let content = xmlParser.parse(jsonObj);
        content = XMLParser.getXMLFirstLine() + content;
        return content;
    }

    static fixObjValues(jsonObj) {
        let jsonRes = {};
        Object.keys(jsonObj).forEach(function (key) {
            let value = jsonObj[key];
            if (Array.isArray(value)) {
                jsonRes[key] = XMLParser.fixArrayValues(value);
            } else if (typeof value === 'object') {
                jsonRes[key] = XMLParser.fixObjValues(value);
            } else {
                if (value !== undefined)
                    jsonRes[key] = value.toString();
                else
                    jsonRes[key] = value;
            }
        });
        return jsonRes;
    }

    static fixArrayValues(jsonArray) {
        let arrayRes = [];
        for (const element of jsonArray) {
            if (Array.isArray(element)) {
                arrayRes.push(XMLParser.fixArrayValues(element));
            } else if (typeof element === 'object') {
                arrayRes.push(XMLParser.fixObjValues(element));
            } else {
                arrayRes.push(element.toString());
            }
        }
        return arrayRes;
    }

    static getXMLFirstLine() {
        return '<?xml version="1.0" encoding="UTF-8"?>\n';
    }

    static startTag(text, tag) {
        if (text.indexOf('<' + tag + '>') !== -1)
            return tag;
        return undefined;
    }

    static endTag(text, tag) {
        if (text.indexOf('</' + tag + '>') !== -1)
            return tag;
        return undefined;
    }

}
module.exports = XMLParser;