import { MetadataType, MetadataObject, MetadataItem, CoreUtils } from "@aurahelper/core";
const Validator = CoreUtils.Validator;

export class MTCommandUtils {

    static getPaths(paths: string, root: string, isFolder?: boolean): string[] {
        const result: string[] = [];
        if (!root.endsWith('/') && !root.endsWith('\\')) {
            root += '/';
        }
        let resultTmp = [paths];
        if (paths.indexOf(',') !== -1) {
            resultTmp = paths.split(',');
        }
        for (let typeTmp of resultTmp) {
            typeTmp = typeTmp.trim();
            const path = (typeTmp.startsWith('./') && typeTmp !== root) ? (root + typeTmp.substring(2)) : typeTmp;
            if (!isFolder) {
                result.push(Validator.validateFilePath(path.trim()));
            } else {
                result.push(Validator.validateFolderPath(path.trim()));
            }
        }
        return result;
    }

    static getTypes(type: string): string[] {
        const types = [];
        let typesTmp = [type];
        if (type.indexOf(',') !== -1) {
            typesTmp = type.split(',');
        } else if (type.indexOf(' ') !== -1) {
            typesTmp = type.split(' ');
        }
        for (const typeTmp of typesTmp) {
            types.push(typeTmp.trim());
        }
        return types;
    }

    static getAdvanceTypes(type: string): { [key: string]: MetadataType } {
        const types: any = {};
        let typesTmp = [type];
        if (type.indexOf(',') !== -1) {
            typesTmp = type.split(',');
        } else if (type.indexOf(' ') !== -1) {
            typesTmp = type.split(' ');
        }
        for (const typeTmp of typesTmp) {
            if (typeTmp.indexOf(':') !== -1) {
                let splits = typeTmp.split(':');
                if (splits.length === 2) {
                    let metadataType = splits[0].trim();
                    let metadataObject = splits[1].trim();
                    if (!types[metadataType]) {
                        types[metadataType] = new MetadataType(metadataType, false);
                    }
                    if (!types[metadataType].childs[metadataObject] && metadataObject !== '*') {
                        types[metadataType].addChild(new MetadataObject(metadataObject, true));
                    }
                    if (metadataObject === '*') {
                        types[metadataType].checked = true;
                    }
                } else if (splits.length === 3) {
                    let metadataType = splits[0].trim();
                    let metadataObject = splits[1].trim();
                    let metadataItem = splits[2].trim();
                    if (!types[metadataType]) {
                        types[metadataType] = new MetadataType(metadataType, false);
                    }
                    if (!types[metadataType].childs[metadataObject] && metadataObject !== '*') {
                        types[metadataType].addChild(new MetadataObject(metadataObject, false));
                    }
                    if (!types[metadataType].childs[metadataObject].childs[metadataItem] && metadataItem !== '*') {
                        types[metadataType].childs[metadataObject].addChild(new MetadataItem(metadataItem, true));
                    }
                    if (metadataObject === '*') {
                        types[metadataType].checked = true;
                    }
                    if (metadataItem === '*') {
                        types[metadataType].childs[metadataObject].checked = true;
                    }
                }
            } else {
                let metadataType = typeTmp.trim();
                types[metadataType] = new MetadataType(metadataType, true);
            }
        }
        return types;
    }
}