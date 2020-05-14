class Response {

    static success(message, data) {
        let body = getResponseBody();
        body.status = 0;
        body.result = {
            message: message,
            data: data
        };
        return JSON.stringify(body, null, 2);
    }

    static error(error, message) {
        let body = getResponseBody();
        let resMessage;
        if (!message) {
            resMessage = error.message;
        }
        else {
            if (message.stack) {
                resMessage = message.name + ': ' + message.message + ' - ' + message.stack;
            } else {
                resMessage = message;
            }
        }
        body.status = error.code;
        body.error = {
            code: error.code,
            name: error.name,
            message: resMessage
        };
        return JSON.stringify(body, null, 2);
    }

    static progress(percentage, message, format) {
        if (!format || format === 'json') {
            let body = getResponseBody();
            body.status = 0;
            body.result = {
                message: message,
                data: {
                    percentage: (percentage) ? percentage : -1,
                }
            };
            return JSON.stringify(body, null, 2);
        } else if (format === 'plaintext') {
            if(percentage)
                return message + ' (' + percentage + '%)';
            else
                return message;
        }
    }

}
module.exports = Response;

function getResponseBody() {
    return {
        status: 0,
        result: undefined,
        error: undefined
    }
}