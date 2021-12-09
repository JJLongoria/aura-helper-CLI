export class CommandUtils {
    static getProgressAvailableTypes(): string[] {
        return [
            'plaintext',
            'json'];
    }

    static hasEmptyArgs(args: any, argsNames: string[]): boolean{
        let nEmpty = 0;
        for(let argName of argsNames){
            if(args[argName] === undefined){
                nEmpty++;
            }
        }
        return nEmpty === argsNames.length;
    }
}