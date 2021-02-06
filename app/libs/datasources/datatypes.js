const winston = require('winston');
const moment = require('moment');
const _ = require('lodash');
const validator = require('validator');
const parseCurrency = require('parsecurrency');
const currencyCodes = require('currency-codes');
const { isMarkdown } = require('../../../shared/markdown');

const { formatFieldValue } = require('../../../shared/fields');

const OPERATIONS = {
    TO_DATE: 'ToDate',
    TO_INTEGER: 'ToInteger',
    TO_FLOAT: 'ToFloat',
    TO_PERCENT: 'ToPercent',
    TO_STRING: 'ToString',
    TO_STRING_TRIM: 'ToStringTrim',
    TO_CURRENCY: 'ToCurrency',
    TO_MARKDOWN: 'ToMarkdown',
    PROXY_EXISTING: 'ProxyExisting',
};

module.exports.OPERATIONS = OPERATIONS;

const {
    TO_DATE, TO_INTEGER, TO_FLOAT, TO_PERCENT, TO_STRING,
    TO_STRING_TRIM, TO_CURRENCY, TO_MARKDOWN, PROXY_EXISTING,
} = OPERATIONS;

const TYPES = {
    DATE: 'Date',
    NUMBER: 'Number',
    INTEGER: 'Integer',
    FLOAT: 'Float',
    PERCENT: 'Percent',
    STRING: 'String',
    STRING_TRIM: 'String Trim',
    TEXT: 'Text',
    CURRENCY: 'Currency',
    MARKDOWN: 'Markdown',
    PROXY: 'Proxy',
};

const {
    DATE, NUMBER, INTEGER, FLOAT, PERCENT, STRING,
    STRING_TRIM, TEXT, CURRENCY, MARKDOWN, PROXY,
} = TYPES;

module.exports.TYPES = TYPES;

const day_date_formats = ['DD/MM/YYYY', 'D/M/YYYY', 'D/MM/YYYY', 'DD/M/YYYY', 'DD/MM/YY HH:mm', 'D/MM/YY HH:mm',
    'D/M/YY HH:mm', 'DD/MM/YY H:mm', 'D/MM/YY H:mm', 'D/M/YY H:mm', 'D/M/YY', 'DD/MM/YY', 'DD/M/YY', 'D/MM/YY',
    'D/MM/YY', 'D-MMM-YY', 'DD-MM-YYYY', 'D-M-YYYY', 'DD-M-YYYY', 'DD-MM-YYYY', 'D-M-YY', 'DD-MM-YY', 'D-MM-YY',
    'DD-M-YY', 'DD-YYYY', 'DD.MM.YYYY', 'D.MM.YYYY', 'D.M.YYYY', 'DD.M.YYYY', 'D.M.YY', 'DD.MM.YY', 'D.MM.YY',
    'DD.M.YY'];

const year_date_formats = ['YYYY/MM/DD', 'YYYY/M/D', 'YYYY/MM/D', 'YYYY/M/DD', 'YY/MM/DD', 'YY/M/D', 'YY/MM/D',
    'YY/M/DD', 'YYYY-MM-DD', 'YYYY-M-D', 'YYYY-MM-D', 'YYYY-M-DD', 'YYYY/MM', 'YYYY/M', 'YY/MM', 'YY/M',
    'YYYYMMDD HH:MM:SS'];

const known_date_formats = ['MM/DD/YYYY', 'M/D/YYYY', 'M/DD/YYYY', 'MM/D/YYYY', 'MM/DD/YY HH:mm', 'M/DD/YY HH:mm',
    'M/D/YY HH:mm', 'MM/DD/YY H:mm', 'M/DD/YY H:mm', 'M/D/YY H:mm', 'M/D/YY', 'MM/DD/YY', 'MM/D/YY', 'M/DD/YY',
    'M/DD/YY', 'MM-DD-YYYY', 'M-D-YYYY', 'MM-D-YYYY', 'MM-DD-YYYY', 'M-D-YY', 'MM-DD-YY', 'M-DD-YY', 'MM-D-YY',
    'MM-YYYY', 'MMM-YY', 'MM.DD.YYYY', 'M.DD.YYYY', 'M.D.YYYY', 'MM.D.YYYY', 'M.D.YY', 'MM.DD.YY', 'M.DD.YY',
    'MM.D.YY', 'MMM YYYY', 'MMMM YYYY', 'MMMM D, YYYY', 'MMM D, YYYY'].concat(year_date_formats);

const isPercentage = function (string) {
    let percentage = true;
    let numberOfPercentSigns = 0;

    _.each(string, function (character, index) {
        if (!isNaN(parseInt(character)) || character === '.' || (character === '-' && index === 0)) {
            // percentage is always at the end of a number so it's safe to make it false every time if character is
            // number or '.' or '-' at the beginning
            percentage = false;
        } else if (character !== '%') {
            // if there's any other character besides a number, decimal or % in the string, percentage is false - fast
            // fail
            return false;
        } else {
            percentage = true;
            // keep track of how many percent symbols for edge case, 4%5%
            numberOfPercentSigns++;
        }
    });

    if (percentage && numberOfPercentSigns === 1) {
        return true;
    }
};

/**
 * @param {String} inString
 * @param {Object} field
 * @returns {String|Number|Date|null}
 */
const fieldValueDataTypeCoercion_coercionFunctions = function (inString, field) {
    if (typeof (inString) === 'string') {
        if (inString.toLowerCase() === 'null') {
            return null;
        }
    }

    if (inString === null) {
        return null;
    }

    const opName = field.operation;

    if (opName === PROXY_EXISTING) {
        return inString;
    }

    if (opName === TO_DATE) {
        if (inString === '') {
            return undefined;
        }

        if (inString === 'Unknown' || inString === 'unknown' ||
            inString === 'Unkown' || inString === 'unkown' ||
            inString === 'Various' || inString === 'various' ||
            inString === 'N/A' || inString === 'n/a') {
            return undefined;
        }

        if (inString === 'n.d.' ||
            inString === 'n.d' ||
            inString === '(n.d.)' ||
            inString === 'n. d.' ||
            inString === 'no date') {
            return null;
        }

        let dateFormatString = field.format;

        if (dateFormatString === '' || _.isNil(dateFormatString)) {
            winston.error(`No format string with which to derive formatted date "${inString}". Returning undefined. (1)`);
            return undefined;
        }
        // var replacement_parseTwoDigitYear_fn = options.replacement_parseTwoDigitYear_fn;
        // if (replacement_parseTwoDigitYear_fn != null && typeof replacement_parseTwoDigitYear_fn !== 'undefined') {
        //     moment.parseTwoDigitYear = replacement_parseTwoDigitYear_fn;
        // }
        if (dateFormatString === 'ISO_8601') {
            dateFormatString = moment.ISO_8601;
        } else if (dateFormatString === 'RFC_2822') {
            dateFormatString = moment.RFC_2822;
        }

        let aMoment;
        if (moment.utc(inString, dateFormatString, true).isValid()) {
            aMoment = moment.utc(inString, dateFormatString);
        } else {
            const knownDateResult = isDate(inString, dateFormatString);
            const edgeDateResult = _isEdgeDate(inString);
            const ISODateResult = _isISODateOrString(inString);

            switch (true) {
                case knownDateResult[0]:
                    dateFormatString = knownDateResult[1];
                    break;
                case edgeDateResult[0]:
                    dateFormatString = edgeDateResult[1];
                    if (dateFormatString === 'QQYYYY') {
                        inString = _translateSample(inString);
                        dateFormatString = 'MM/DD/YYYY';
                    }
                    break;
                case ISODateResult[0]:
                    dateFormatString = ISODateResult[1];
                    break;
                default:
                    return undefined;
            }
            aMoment = moment.utc(inString, dateFormatString);
        }

        if (!aMoment.isValid()) {
            winston.warn(`The date "${inString}" cannot be parsed with the format string "${dateFormatString}". Returning null.`);

            return null;
        }
        return aMoment.toDate();

    }

    if (opName === TO_INTEGER || opName === TO_FLOAT || opName === TO_PERCENT) {
        if (inString === '') {
            return null;
        }

        let stringWithoutComma = inString;

        if (typeof (inString) === 'string') {
            const commaRE = /,/g;

            stringWithoutComma = stringWithoutComma.replace(commaRE, '');
        }
        if (!isNaN(parseFloat(stringWithoutComma))) {
            if (isPercentage(stringWithoutComma)) {
                inString = parseFloat(stringWithoutComma) / 100;
            } else {
                inString = parseFloat(stringWithoutComma);
            }
        } else {
            // TODO: error message that string couldn't be parsed as number
        }

        return inString;
    }

    if (opName === TO_CURRENCY) {
        if (inString === '') {
            return null;
        }

        const parsedCurrency = parseCurrency(inString);

        if (parsedCurrency) {
            return parsedCurrency.value;
        } else {
            return null;
        }
    }

    if (opName === TO_STRING_TRIM) {
        return inString.trim();
    }

    if (opName === TO_STRING) {
        return inString ? inString.toString() : '';
    }

    return inString;
};

/**
 * @param {Object} coercionSchemeForKey
 * @param {String} rowValue
 * @returns {String|Number|Date|null}
 */
module.exports.newDataTypeCoercedValue = function (coercionSchemeForKey, rowValue) {
    const { operation } = coercionSchemeForKey;

    if (!operation) {
        winston.error('Illegal, malformed, or missing operation name at key \'operation\' in coercion scheme.' +
            ' Returning undefined.\ncoercionSchemeForKey:\n', coercionSchemeForKey);

        return undefined;
    }

    return fieldValueDataTypeCoercion_coercionFunctions(rowValue, coercionSchemeForKey);
};

module.exports.originalValue = function (coercionSchemeForKey, rowValue) {
    if (coercionSchemeForKey && coercionSchemeForKey.operation) {
        return formatFieldValue(rowValue, coercionSchemeForKey);
    } else {
        return rowValue;
    }
};

module.exports.fieldDataType_coercion_toString = function (field = {}) {
    const toType = {
        [PROXY_EXISTING]: PROXY,
        [TO_DATE]: DATE,
        [TO_INTEGER]: INTEGER,
        [TO_FLOAT]: FLOAT,
        [TO_PERCENT]: PERCENT,
        [TO_STRING_TRIM]: STRING_TRIM,
        [TO_CURRENCY]: CURRENCY,
    };

    return toType[field.operation] || STRING;
};

module.exports.doesExistFormat_fieldDataType_coercion_toString = function (field) {
    if (!field) {
        return false;
    }

    const opName = field.operation;

    if (opName === TO_DATE) {
        return true;
    }

    return false;
};

const isDate = function (sample, inputFormat) {
    let dateFormats = known_date_formats;

    if (inputFormat) {
        const beginsWith = inputFormat[0];

        if (beginsWith === 'D') {
            dateFormats = day_date_formats;
        } else if (beginsWith === 'Y') {
            dateFormats = year_date_formats;
        }
    }

    for (let i = 0; i < dateFormats.length; i++) {
        const format = dateFormats[i];

        if (moment(sample, format, true).isValid()) {
            return [true, format];
        }
    }

    return [false, null];
};
module.exports.isDate = isDate;

/**
 * @param {String} sample
 * @returns {String[]}
 */
function getDateUnit(sample) {
    const dateFormats = [
        ['Y', 'year'],
        ['YYYY-MM', 'month'],
        ['YYYY-MM-DD', 'day'],
    ];

    const format = dateFormats.find((format) => {
        return moment(sample, format[0], true).isValid();
    });

    return format || [];
}

module.exports.getDateUnit = getDateUnit;

const _translateSample = function (sample) {
    const quarterDate = {
        '1Q': '01/01/',
        '2Q': '04/01/',
        '3Q': '07/01/',
        '4Q': '10/01/',
    };
    // check if Q in string before translating to a date
    if (sample.includes('Q')) {
        const quarter = sample.split('Q')[0] + 'Q';
        const dateString = sample.replace(quarter, quarterDate[quarter]);

        return dateString;
    }
    return 'Invalid Date';
};
module.exports.translateSample = _translateSample;

const isQuarterDate = function (sample) {
    return new Date(_translateSample(sample));
};

// AKA. Dates that could be easily confused for an int
const _isEdgeDate = function (sample) {
    if (moment(sample, 'YYYY', true).isValid()) {
        return [true, 'YYYY'];
    } else if (moment(sample, 'YYYYMMDD', true).isValid()) {
        return [true, 'YYYYMMDD'];
    } else if (moment(sample, moment.ISO_8601, true).isValid()) {
        return [true, 'ISO_8601'];
    } else if (moment(sample, moment.RFC_2822, true).isValid()) {
        return [true, 'RFC_2822'];
        //for aspi
    } else if (moment(isQuarterDate(sample)).isValid()) {
        return [true, 'QQYYYY'];
    } else {
        return [false, null];
    }
};
module.exports.isEdgeDate = _isEdgeDate;

const _isISODateOrString = function (sample) {
    if (moment(sample, moment.ISO_8601, true).isValid()) {
        return [true, 'ISO_8601'];
    }

    return [false, null];
};
module.exports.isISODateOrString = _isISODateOrString;

const _isValidFormat = function (format) {
    const separatorRE = /(\s|-|\/)/;

    if (!separatorRE.test(format) && format.length > 4) {
        return false;
    }

    return true;
};
module.exports.isValidFormat = _isValidFormat;

const _makeFormatValid = function (format) {
    const formatRE = /(Y+)(M+)(D+)/;

    return format.split(formatRE).filter(Boolean).join('-');

};
module.exports.makeFormatValid = _makeFormatValid;

const _verifyDataType = (name, sample, rowObject) => {
    const { operation } = rowObject;
    let numberWithoutComma = sample;

    if (typeof (sample) === 'string') {
        numberWithoutComma = sample.replace(/,/g, ''); // remove all commas
    }
    const resolvedCurrency = parseCurrency(numberWithoutComma);

    const notNumberRE = /([^0-9\.,%-]|\s)/; // Matches inputs which aren't numbers
    const secondRowObject = _intuitDatatype(name, sample);
    const isNotDate = operation === TO_DATE && !moment(sample, rowObject.input_format, true).isValid();
    const isNotNumber = (operation === TO_INTEGER || operation === TO_FLOAT || operation === TO_PERCENT) && notNumberRE.test(sample);
    const isNotInteger = ((operation === TO_INTEGER) && !notNumberRE.test(sample));
    const isNotCurrency = operation === TO_CURRENCY && (!resolvedCurrency || !(resolvedCurrency.symbol || resolvedCurrency.currency));
    const isNotValid = (isNotDate || isNotNumber || isNotInteger || isNotCurrency) && !rowObject.createdField;

    if (isNotValid) {
        rowObject.data_type = secondRowObject.data_type;
        rowObject.operation = secondRowObject.operation;
    }

    return rowObject;
};
module.exports.verifyDataType = _verifyDataType;

const _intuitDatatype = function (name, sample) {
    const currencySymbols = [
        'د.إ', '؋', 'L', '֏', 'ƒ', 'Kz', '$', 'ƒ', '₼', 'KM',
        '৳', 'лв', '.د.ب', 'FBu', '$b', 'R$', '$', '฿', 'Nu.',
        'P', 'Br', 'Br', 'BZ$', 'FC', 'CHF', '¥', '₡', '₱',
        'Kč', 'Fdj', 'kr', 'RD$', 'دج', 'kr', '£', 'Nfk', 'Br',
        'Ξ', '€', '$', '₾', '₵', 'GH₵', 'D', 'FG', 'Q', 'L', 'kn',
        'G', 'Ft', 'Rp', '₪', '₹', 'ع.د', '﷼', 'J$', 'JD', '¥',
        'KSh', 'лв', '៛', 'CF', '₩', 'KD', '₭', '₨', 'M',
        'Ł', 'Lt', 'Ls', 'LD', 'MAD', 'lei', 'Ar', 'ден', 'K', '₮', 'MOP$',
        'UM', '₨', 'Rf', 'MK', '$', 'RM', 'MT', '₦', 'C$', '﷼',
        'B/.', 'S/.', 'K', '₱', '₨', 'zł', 'Gs', '﷼', '￥', 'lei',
        'Дин.', '₽', 'R₣', '﷼', '₨', 'ج.س.', 'Le', 'S', 'Db', 'E',
        '฿', 'SM', 'T', 'د.ت', 'T$', '₺', 'TT$',
        'NT$', 'TSh', '₴', 'USh', '$U', 'лв', 'Bs', '₫', 'VT', 'WS$',
        'FCFA', 'Ƀ', '$', 'CFA', '₣', '﷼', 'R', 'Z$',
    ];

    if (_.isObject(sample) || _.isUndefined(sample) || _.isBoolean(sample) || _.isNull(sample)) {
        return { name, sample, data_type: TEXT, operation: TO_STRING };
    }

    // If we get explicitly type number then try to check if it is float or integer
    if (typeof sample === 'number') {
        return {
            name,
            sample,
            data_type: NUMBER,
            operation: validator.isInt(sample.toString()) ? TO_INTEGER : TO_FLOAT,
        };
    }

    let format = isDate(sample)[1];

    if (format !== null) {
        return {
            name, sample, data_type: DATE, input_format: format, output_format: format,
            operation: TO_DATE,
        };
    }

    const dateRE = /(year|DATE|Field)/i;
    if (dateRE.test(name)) {
        format = _isEdgeDate(sample)[1];

        if (format === 'ISO_8601') {
            return {
                name, sample, data_type: DATE, input_format: format, output_format: 'YYYY-MM-DD',
                operation: TO_DATE,
            };
        }

        if (format === 'RFC_2822') {
            return {
                name, sample, data_type: DATE, input_format: format, output_format: 'YYYY-MM-DD',
                operation: TO_DATE,
            };
        }

        // aspi date
        if (format === 'QQYYYY') {
            return {
                name, sample, data_type: DATE, input_format: format, output_format: 'MM/YYYY',
                operation: TO_DATE,
            };
        }

        if (format !== null) {
            if (_isValidFormat(format)) {
                return {
                    name, sample, data_type: DATE, input_format: format, output_format: format,
                    operation: TO_DATE,
                };
            }

            const valid_format = _makeFormatValid(format);
            return {
                name, sample, data_type: DATE, input_format: format, output_format: valid_format,
                operation: TO_DATE,
            };
        }

        return { name, sample, data_type: TEXT, operation: TO_STRING };
    }

    // if the sample has anything other than numbers and a "." or a "," or a "%" then it's most likely a string
    // try to parse first as a currency
    const IdRE = /(Id|ID)/;
    let numberWithoutComma = sample;
    if (typeof (sample) === 'string') {
        numberWithoutComma = sample.replace(/,/g, ''); // remove all commas
    }

    const resolvedCurrency = parseCurrency(numberWithoutComma);
    const isPercent = isPercentage(numberWithoutComma);
    const isNumeric = validator.isNumeric(numberWithoutComma) || isPercent;
    const isCurrency = !isNumeric && resolvedCurrency &&
        ((resolvedCurrency.currency && currencyCodes.codes().includes(resolvedCurrency.currency)) ||
            (resolvedCurrency.symbol && currencySymbols.includes(resolvedCurrency.symbol)));

    if (isCurrency) {
        return {
            name,
            sample,
            data_type: NUMBER,
            operation: TO_CURRENCY,
            currency: resolvedCurrency.currency ? resolvedCurrency.currency : resolvedCurrency.symbol,
        };
    }

    if (!isNumeric || IdRE.test(name) || numberWithoutComma === '') {
        // if it's definitely not a number, double check to see if it's a valid ISO 8601 date
        format = _isISODateOrString(sample)[1];
        if (format !== null) {
            return {
                name, sample, data_type: DATE, input_format: format, output_format: 'YYYY-MM-DD',
                operation: TO_DATE,
            };
        }
    } else if (isNumeric && !isNaN(parseFloat(numberWithoutComma))) {
        if (isPercent) {
            return {
                name,
                sample,
                data_type: NUMBER,
                operation: TO_PERCENT,
            };
        }

        return {
            name,
            sample,
            data_type: NUMBER,
            operation: validator.isInt(numberWithoutComma) ? TO_INTEGER : TO_FLOAT,
        };
    }

    if (isMarkdown(sample)) {
        return {
            name,
            sample,
            data_type: MARKDOWN,
            operation: TO_MARKDOWN,
        };
    }

    return { name, sample, data_type: TEXT, operation: TO_STRING };
};
module.exports.intuitDatatype = _intuitDatatype;
