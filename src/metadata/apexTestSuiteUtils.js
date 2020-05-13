const Utils = require('./utils');
const XMLParser = require('../languages').XMLParser;

class ApexTestSuiteUtils { 

    static createApexTestSuite(apexTestSuite) { 
        let newApexTestSuite;
        if (apexTestSuite) {
            newApexTestSuite = Utils.prepareXML(apexTestSuite, ApexTestSuiteUtils.createApexTestSuite());
        } else {
            newApexTestSuite = {
                testClassName: [],
            }
        }
        return newApexTestSuite;
    }

    static toXML(apexTestSuite, compress) { 
        let xmlLines = [];
        if (apexTestSuite) { 
            if (compress) {
                xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>');
                xmlLines.push('<ApexTestSuite xmlns="http://soap.sforce.com/2006/04/metadata">');
                if (apexTestSuite.testClassName && apexTestSuite.testClassName.length > 0) { 
                    xmlLines = xmlLines.concat(Utils.getXMLBlock('testClassName', apexTestSuite.testClassName, true, 1));
                }
                xmlLines.push('</ApexTestSuite>');
            } else { 
                return XMLParser.toXML(apexTestSuite);
            }
        }
        return xmlLines.join('\n');
    }

}
module.exports = ApexTestSuiteUtils;