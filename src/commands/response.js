const { AuraHelperCLIResponse, AuraHelperCLIProgress, AuraHelperCLIError } = require('@aurahelper/core').Types;

class ErrorBuilder{

    constructor(errorType){
        this._status = -1;
        this._code = errorType.code;
        this._message = errorType.message;
    }

    status(status){
        this._status = status;
        return this;
    }

    message(message){
        this._message = (!this._message) ? message : this._message + '. ' + message;
        return this;
    }

    exception(exception){
        this._message = (!this._message) ? message : this._message + '. Error Message: ' + exception.message;
        this._name = exception.name;
        return this;
    }

    toString(){
        const body = new AuraHelperCLIError(this._status, this._name, this._code, this._message);
        return JSON.stringify(body, null, 2);
    }        
}
exports.ErrorBuilder = ErrorBuilder;

class ProgressBuilder{

    constructor(format){
        this._status = 0;
        this._format = format;
        this._increment = -1;
        this._percentage = -1;
    }

    increment(increment){
        this._increment = increment;
        if(this._increment > 100)
            this._increment = 100;
        if(this._increment == 0)
            this._increment = -1;
        return this;
    }

    percentage(percentage){
        this._percentage = percentage;
        if(this._percentage > 100)
            this._percentage = 100;
        if(!this._percentage)
            this._percentage = -1;
        return this;
    }

    status(statusCode){
        this._status = statusCode;
        return this;
    }

    message(message){
        this._message = (!this._message) ? message : this._message + '. ' + message;
        return this;
    }

    toString(){
        if (!this._format || this._format === 'json') {
            const body = new AuraHelperCLIProgress(this._status, this._message, this._increment, this._percentage);
            return JSON.stringify(body, null, 2);
        } else {
            if (this._percentage)
                return this._message + ' (' + this._percentage + '%)';
            else
                return this._message;
        }
    }        
}
exports.ProgressBuilder = ProgressBuilder;

class ResponseBuilder {

    constructor(message){
        this._status = 0;
        this._message = message;
        this._data = {};
    }

    message(message){
        this._message = (!this._message) ? message : this._message + '. ' + message;
        return this;
    }

    data(data){
        this._data = data;
        return this;
    }

    toString(){
        const body = new AuraHelperCLIResponse(this._status, this._message, this._data);
        return JSON.stringify(body, null, 2);
    } 
}
exports.ResponseBuilder = ResponseBuilder;