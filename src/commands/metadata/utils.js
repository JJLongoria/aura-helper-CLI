
class Utils {

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
                let metadataType = splits[0].trim();
                let metadataObject = splits[1].trim();
                if (!types[metadataType])
                    types[metadataType] = [];
                types[metadataType].push(metadataObject);
            } else {
                let metadataType = typeTmp.trim();
                types[metadataType] = ['*'];
            }
        }
        return types;
    }
}
module.exports = Utils;