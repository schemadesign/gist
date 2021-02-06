const winston = require('winston');
const dateFormat = require('dateformat');
const expressWinston = require('express-winston');

require('winston-mongodb');

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'testing';
const levelSymbol = Symbol.for('level');
let logLevel;
let logColorize;
let winstonConfigured = false;

if (process.env.LOG_LEVEL) {
    logLevel = process.env.LOG_LEVEL;
    logColorize = winston.format.colorize();
} else if (isDev) {
    logLevel = 'debug';
    logColorize = winston.format.colorize();
} else {
    logLevel = 'error';
    logColorize = winston.format.uncolorize();
}

const logDate = () => dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
const selectLogIcon = (level) => {
    switch (level) {
        case 'debug':
            return '💬';

        case 'info':
            return 'ℹ️';

        case 'warn':
        case 'warning':
            return '⚠️';

        case 'alert':
        case 'error':
            return '❌';

        case 'emerg':
        case 'crit':
        case 'critical':
            return '🔥';
    }

    return '';
};

module.exports = {
    configureWinston,
    expressLogger,
    errorLogger,
};

function formatWinstonError(message) {
    if (message instanceof Error) {
        return message.stack;
    }

    if (message instanceof Array) {
        return message.map(e => formatWinstonError(e)).join('\n');
    }

    return JSON.stringify(message);
}

function configureWinston() {
    if (winstonConfigured) {
        return;
    }

    const transports = [
        new winston.transports.Console(),
    ];

    winston.configure({
        format: winston.format.combine(
            logColorize,
            winston.format.splat(),
            winston.format.printf((options) => {
                const parsedOptions = options instanceof Error ? {
                    message: options,
                } : options;

                return [
                    selectLogIcon(options[levelSymbol]),
                    options.level,
                    '|',
                    logDate() + ':',
                    formatWinstonError(parsedOptions.message),
                    parsedOptions.meta ? `\n${formatWinstonError(parsedOptions.meta)}` : '',
                ].join(' ');
            }),
        ),
        level: logLevel,
        silent: isTest,
        transports,
    });

    winstonConfigured = true;
}

function expressLogger(app) {
    if (!isDev && logLevel !== 'debug') {
        return;
    }

    expressWinston.requestWhitelist.push('body');
    expressWinston.responseWhitelist.push('body');
    app.use(expressWinston.logger({
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    logColorize,
                    winston.format.splat(),
                    winston.format.printf((options) => {
                        const level = options[levelSymbol];

                        return [
                            selectLogIcon(level),
                            options.level,
                            '|',
                            logDate() + ':',
                            options.message ? JSON.stringify(options.message) : '',
                            level === 'error' && options.meta ? `\n\t response: ${JSON.stringify(options.meta.res)}` : '',
                        ].join(' ');
                    }),
                ),
                level: 'info',
                silent: isTest,
            }),
        ],
        level: (req, res) => {
            let level = logLevel;
            if (res.statusCode >= 100) {
                level = 'info';
            }
            if (res.statusCode >= 400) {
                level = 'warn';
            }
            if (res.statusCode >= 500) {
                level = 'error';
            }
            // Ops is worried about hacking attempts so make Unauthorized and Forbidden critical
            if (res.statusCode === 403) {
                level = 'crit';
            }
            return level;
        },
    }));
}

function errorLogger(app) {
    const getMeta = meta => `\n\t${meta.error ? `${meta.error.message}\n${meta.error.stack}` : JSON.stringify(meta)}`;

    app.use(expressWinston.errorLogger({
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    logColorize,
                    winston.format.splat(),
                    winston.format.printf((options) => {
                        return [
                            '❌',
                            options.level,
                            '|',
                            logDate() + ':',
                            options.message ? JSON.stringify(options.message) : '',
                            options.meta ? getMeta(options.meta) : '',
                        ].join(' ');
                    }),
                ),
            }),
        ],
    }));
}
