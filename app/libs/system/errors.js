let GlobalError = Error;

if (process.env.NODE_ENV === 'testing') {
    // Workaround for `new PublicError() instanceof PublicError` returning false
    GlobalError = class {
        constructor(message) {
            this.message = message;
            this.stack = null;
        }

        toString() {
            return `Error: ${this.message}`;
        }
    };
}

class ExtendableError extends GlobalError {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.stack = (new GlobalError(message)).stack;
    }
}

class PublicError extends ExtendableError {
}

class UserError extends PublicError {
    constructor(message) {
        super(message);
        this.statusCode = 400;
    }
}

class RequestError extends ExtendableError {
    constructor(message) {
        super(message);
        this.statusCode = 400;
    }
}

class ForbiddenError extends ExtendableError {
    constructor(message) {
        super(message);
        this.statusCode = 403;
    }
}

module.exports = {
    PublicError,
    UserError,
    RequestError,
    ForbiddenError
};
