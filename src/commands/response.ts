import { AuraHelperCLIError, AuraHelperCLIProgress, AuraHelperCLIResponse } from '@aurahelper/core';

export class ErrorBuilder {

    _status: number;
    _code: string;
    _message: string;
    _name?: string;

    constructor(errorType: any) {
        this._status = -1;
        this._code = errorType.code;
        this._message = errorType.message;
    }

    status(status: number): ErrorBuilder {
        this._status = status;
        return this;
    }

    message(message: string): ErrorBuilder {
        this._message = (!this._message) ? message : this._message + '. ' + message;
        return this;
    }

    exception(exception: Error): ErrorBuilder {
        this._message = this._message + '. Error Message: ' + exception.message;
        this._name = exception.name;
        return this;
    }

    toString(): string {
        const body = new AuraHelperCLIError(this._status, this._name, this._code, this._message);
        return JSON.stringify(body, null, 2);
    }
}

export class ProgressBuilder {

    _status: number;
    _format: string;
    _increment: number;
    _percentage: number;
    _message?: string;

    constructor(format: string) {
        this._status = 0;
        this._format = format;
        this._increment = -1;
        this._percentage = -1;
    }

    increment(increment: number): ProgressBuilder {
        this._increment = increment;
        if (this._increment > 100)
            this._increment = 100;
        if (this._increment == 0)
            this._increment = -1;
        return this;
    }

    percentage(percentage: number): ProgressBuilder {
        this._percentage = percentage;
        if (this._percentage > 100)
            this._percentage = 100;
        if (!this._percentage)
            this._percentage = -1;
        return this;
    }

    status(status: number): ProgressBuilder {
        this._status = status;
        return this;
    }

    message(message: string): ProgressBuilder {
        this._message = (!this._message) ? message : this._message + '. ' + message;
        return this;
    }

    toString(): string {
        if(!this._message){
            this._message = '';
        }
        if (!this._format || this._format === 'json') {
            const body = new AuraHelperCLIProgress(this._status, this._message, this._increment, this._percentage);
            return JSON.stringify(body, null, 2);
        } else {
            if (this._percentage)
                return this._message + ' (' + this._percentage + '%)';
            else {
                return this._message;
            }
        }
    }
}

export class ResponseBuilder {

    _status: number;
    _message: string;
    _data: any;

    constructor(message: string) {
        this._status = 0;
        this._message = message;
        this._data = {};
    }

    message(message: string): ResponseBuilder {
        this._message = (!this._message) ? message : this._message + '. ' + message;
        return this;
    }

    data(data: any): ResponseBuilder {
        this._data = data;
        return this;
    }

    toString(): string {
        const body = new AuraHelperCLIResponse(this._status, this._message, this._data);
        return JSON.stringify(body, null, 2);
    }
}