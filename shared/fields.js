const moment = require('moment');
const _ = require('lodash');

module.exports = {
    formatDateValue,
    formatFieldValue,
    displayNumberWithComma,
    getOperation,
};

function formatDateValue(value, format, input_format) {
    const ISO = 'ISO_8601';

    if (format === '' || _.isNil(format)) {
        return undefined;
    }

    let date = moment.utc(value);

    if (moment.utc(value, ISO).isValid() && input_format) {
        return date.format(format);
    }

    if (input_format) {
        date = moment.utc(value, input_format);
    }

    if (date === null || !date.isValid()) {
        // Invalid
        return null;
    }

    if (format === 'QQYYYY') {
        return reverseQuarterDate(value);
    }

    if (format === ISO) {
        return date.toISOString();
    }

    if (format === 'RFC_2822') {
        const DATE_RFC2822 = moment.RFC_2822;
        return date.format(DATE_RFC2822);
    }

    return date.format(format);
}

function formatFieldValue(value, { operation, currency, input_format, outputFormat, output_format, usePercent }, sample) {
    if (_.isNil(value)) {
        return value;
    }

    if (operation === 'ToDate') {
        return formatDateValue(value, outputFormat || output_format, input_format);
    }

    if (input_format) {
        value = moment(value).utc().format(input_format);
    }

    if (operation === 'ToPercent') {
        if (_.isNil(usePercent) || usePercent) {
            const percentValue = value * 100;
            const updatedValue = displayNumberWithComma(Math.round(percentValue * 100) / 100);

            return `${updatedValue}%`;
        }

        return displayNumberWithComma(value);
    }

    if (operation === 'ToCurrency') {
        return `${value} ${currency}`;
    }

    if (operation === 'ToInteger' || operation === 'ToFloat') {
        if (sample) {
            return _.toNumber(value);
        }

        return displayNumberWithComma(value);
    }

    return value;
}

function reverseQuarterDate(date) {
    const monthsToQuarters = {
        0: '1Q',
        3: '2Q',
        6: '3Q',
        9: '4Q',
    };

    try {
        const year = date.getUTCFullYear();
        const monthString = date.getUTCMonth();

        return `${monthsToQuarters[monthString]}${year}`;
    } catch (e) {
        return date;
    }
}

function displayNumberWithComma(number) {
    if (typeof number !== 'object') {
        var parts = _.toString(number).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }
    return number;
}
const equals = a => b => _.isEqual(a, b);

function getOperation(dataType) {
    return _.cond([
        [equals('Text'), _.constant('ToString')],
        [equals('Markdown'), _.constant('ToMarkdown')],
        [equals('Number'), _.constant('ToFloat')],
        [equals('Percent'), _.constant('ToPercent')],
        [equals('Date'), _.constant('ToDate')],
        [_.stubTrue, _.constant('ToString')],
    ])(dataType);
}
