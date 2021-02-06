const { Transform } = require('stream');
const parse = require('csv-parse');
const es = require('event-stream');
const fs = require('fs');
const JSONStream = require('JSONStream');
const _ = require('lodash');
const winston = require('winston');
const AutoDetectDecoderStream = require('autodetect-decoder-stream');

const { flatten } = require('./flatten-helpers');
const reimport = require('./reimport');
const datatypes = require('../../../libs/datasources/datatypes');
const uploadHelpers = require('./upload-helpers');
const { fieldDelimiter } = require('./nested');
const { Lazy_Shared_ProcessedRowObject_MongooseContext } = require('./../../../models/processed_row_objects');
const { PublicError } = require('../../../libs/system/errors');
const { formatColumnName, formatRawValues } = require('../../../utils/helpers');

const filterEmptySamples = columns => columns.filter(({ sample }) => sample === '');
const mapNames = columns => columns.map(({ name }) => formatColumnName(name));
const getEmptySamples = columns => mapNames(filterEmptySamples(columns));
const flattenKeys = input => flatten(input, fieldDelimiter);
module.exports.flattenKeys = flattenKeys;

/**
 * Gets the source name of a dataset description.
 * @param {*} description
 */
const getSourceName = description => _.get(description.smartsheet, 'name') || _.get(description.datadotworld, 'id') || _.get(description.salesforce, 'name') || description.fileName || description.apiEndPoint || description.pipedrive;

module.exports.getSourceName = getSourceName;

/* Converts *.csv file stream to parsed lines (as Arrays) stream */
const getCsvParseStream = (delimiter) => parse({
    relax: true,
    skip_empty_lines: true,
    delimiter,
    trim: true,
    auto_parse: value => value.replace(/\n/g, ' '),
});

/* Converts *.json file stream to objects stream */
const getJsonParseStream = (path) => JSONStream.parse(path);

/* Converts objects stream to parsed lines (as Arrays) stream */
const getJsonToLinesStream = () => new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(chunk, encoding, callback) {
        const parsedChunk = flattenKeys(chunk);

        _.forEach(parsedChunk, (element) => {
            if (!this._firstLineKeys) {
                this._firstLineKeys = _.keys(element);
                this.push(this._firstLineKeys);
            }
            this.push(this._firstLineKeys.map(key => _.get(element, key, '')));
        });
        callback();
    },
});

module.exports.getJsonToLinesStream = getJsonToLinesStream;

/* Takes the line stream */
const prepareColumnsFromlinesStream = (fileReadStream, description, replacement) => new Promise((resolve, reject) => {
    const delimitersMap = { CSV: ',', TSV: '\t' };
    const { format } = description;
    const sourceName = getSourceName(description);

    // Empty JSONPath should be set to null, due to the internal handling by JSONStream.
    let JSONPath = null;
    if (_.isString(description.JSONPath) && description.JSONPath) {
        JSONPath = description.JSONPath;
    }

    let columns;
    const overrideColumns = [];
    let readStream = fileReadStream;
    let lineNumber = 0;

    const handleError = (error) => {
        readStream.destroy();
        reject(error);
    };

    const handleSuccess = (missingSamples) => {
        readStream.destroy();
        const getRawColumns = uploadHelpers.setSaveColumnsFunction(description);
        const raw_rowObjects_coercionScheme = getRawColumns(columns);

        if (!columns) {
            return handleError(new PublicError('We couldn\'t find any data.'));
        }

        columns = columns.map((column) => {
            if (!_.has(column, 'sample')) {
                return column;
            }

            return Object.assign(column, {
                sample: datatypes.newDataTypeCoercedValue(raw_rowObjects_coercionScheme[column.name], column.sample),
            });
        });
        resolve({ columns, missingSamples, overrideColumns });
    };

    readStream.on('error', handleError);

    if (['TSV', 'CSV'].includes(format)) {
        const delimiter = delimitersMap[format];
        readStream = readStream.pipe(new AutoDetectDecoderStream()).pipe(getCsvParseStream(delimiter)).on('error', handleError);
    } else if (format === 'JSON') {
        readStream = readStream.pipe(getJsonParseStream(JSONPath)).on('error', handleError).pipe(getJsonToLinesStream()).on('error', handleError);
    } else {
        handleError(new PublicError(`Invalid File Format: ${format}`));
        return;
    }

    readStream = readStream.pipe(es.mapSync(line => {
        // first line contains list of columns
        if (lineNumber === 0) {
            if (!_.isArray(line)) {
                return handleError(new PublicError('Invalid File'));
            }

            if (_.get(line, 0, '').trim().startsWith('<!DOCTYPE')) {
                return handleError(new PublicError('No permission to read the file or wrong format'));
            }

            if (line.length < 2) {
                return handleError(new PublicError(`Wrong number of columns, expected at least 2, found ${line.length}`));
            }

            columns = line.map(name => ({
                name: formatColumnName(name),
                sourceName,
            }));
            columns.filter(({ name }) => !name).forEach((column, index) => Object.assign(column, { name: `Field ${index + 1}` }));
        } else if (lineNumber === 1) {
            columns = columns.map((column, index) => Object.assign({ sample: formatRawValues(line[index]) }, column));

            if (!_.isEmpty(description.createdFields)) {
                const intersectionValues = _.intersectionBy(columns, description.createdFields, 'name');

                overrideColumns.push(...intersectionValues.map(({ name }) => name));
                columns = _.unionBy(columns, description.createdFields, 'name');
            }

            reimport.mapColumnsOrErr(columns, description.raw_rowObjects_coercionScheme, replacement, (err, mappedColumns, equal) => {
                if (err) {
                    return handleError(err);
                }

                if (equal && !overrideColumns.length) {
                    columns = [];
                    return handleSuccess();
                }

                columns = mappedColumns;
            });
            columns = columns.map((column, index) => {
                // no need to verify the data type if the sample is empty
                if (line[index] !== '') {
                    return datatypes.verifyDataType(column.name, line[index], column);
                }

                return column;
            });
        } else if (columns.every(({ sample }) => sample !== '')) {
            return handleSuccess();
        } else if (lineNumber === 1000) {
            // if 1000 lines have been parsed and there's still not a sample more significant than an empty string
            // for each column return the columns and missingSamples
            const emptySamples = getEmptySamples(columns);

            return handleSuccess(emptySamples);
        } else {
            columns.forEach((column, index) => {
                // if there's no sample currently and if the current line has a value other than an empty string
                if (column.sample === '' && line[index] !== '' && !column.createdField) {
                    Object.assign(column, datatypes.intuitDatatype(column.name, line[index]));
                }
            });
        }
        lineNumber++;
    })).on('error', handleError).on('end', () => handleSuccess());
});

/**
 * parses the first 4 lines of CSV or JSON file
 * passes into functions that intuit datatypes
 * creates columns that are used throughout the dataset dashboard
 * @param {Boolean} replacement
 * @param {Object} description
 * @param {Buffer} fileReadStream
 * @param {Function} next
 * @return {Promise<Array>} columns
 */
function _readDatasourceColumnsAndSampleRecords(replacement, description, fileReadStream, next) {
    return prepareColumnsFromlinesStream(fileReadStream, description, replacement).then(({ columns, missingSamples, overrideColumns }) => {
        next(null, columns, missingSamples, overrideColumns);
    }).catch(error => {
        winston.error('_readDatasourceColumnsAndSampleRecords err:', error);
        next(error);
    });
}

module.exports.readDatasourceColumnsAndSampleRecords = _readDatasourceColumnsAndSampleRecords;

/**
 * constructs raw row objects coercion scheme from columns
 * @param {Object[]} columns
 * @example columns
 * [{
 *     name: 'dateColumn',
 *     sample: '01/2018',
 *     data_type: 'Date',
 *     operation: 'ToDate',
 *     output_format: 'MM-YYYY',
 *     input_format: 'MM/YYYY',
 *     sourceName: 'someFile.csv',
 *     sourceType: 'spreadsheet',
 * }]
 * @return {Object}
 * @example return
 * {
 *     dateColumn: {
 *         operation: 'ToDate',
 *         outputFormat: 'MM-YYYY',
 *         format: 'YYYY',
 *     }
 * }
 */
const _saveColumnsToRowObjects = (columns) => {
    return _.reduce(columns, (accumulator, { name, operation, output_format, input_format, currency }) => {
        const column = {
            operation: operation,
        };

        if (operation === 'ToDate') {
            column.outputFormat = output_format;
            column.format = input_format;
        } else if (operation === 'ToCurrency') {
            column.currency = currency;
        }

        return Object.assign(accumulator, { [name]: column });
    }, {});
};
module.exports.saveColumnsToRowObjects = _saveColumnsToRowObjects;

/**
 * Gets the session columns description from the data already stored in database
 *
 * @param {DatasourceDescription} description
 * @param {function} callback
 */
const exportColumnsFromCoercion = async (description, callback) => {
    try {
        const { Model: ProcessedRowObjects } = Lazy_Shared_ProcessedRowObject_MongooseContext(description._id);
        const firstRow = await ProcessedRowObjects.findOne({});

        // don't try to add any columns if there's no sample data
        if (!firstRow) {
            return callback(null, null);
        }

        const output = _.map(description.raw_rowObjects_coercionScheme, ({ operation, outputFormat, format, currency }, name) => {
            const column = {
                name,
                operation,
                sourceType: 'spreadsheet',
                sourceName: getSourceName(description),
                sample: firstRow.rowParams[name],
            };

            if (operation === 'ToDate') {
                column.output_format = outputFormat;
                column.input_format = format;
            } else if (operation === 'ToCurrency') {
                column.currency = currency;
            }

            return column;
        });

        callback(null, output);
    } catch (e) {
        callback(e);
    }
};
module.exports.exportColumnsFromCoercion = exportColumnsFromCoercion;

/**
 * Validates the mimetype, size and extension of the file.
 * @param {File} file
 * @param {DatasourceDescription_scheme} description
 * @param {function} callback
 */
const _validateFile = (file, description, callback) => {
    const exts = file.originalname.split('.');
    const ext = exts[exts.length - 1].toLowerCase();

    if (
        file.mimetype === 'text/plain' ||
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/octet-stream' ||
        file.mimetype === 'text/tab-separated-values' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/json'
    ) {
        const sizeLimits = {
            csv: 157286400, // 150 MB
            tsv: 157286400, // 150 MB
            json: 78643200, // 75 MB
        };
        switch (ext) {
            case 'csv':
                description.format = 'CSV';
                break;
            case 'tsv':
                description.format = 'TSV';
                break;
            case 'json':
                description.format = 'JSON';
                break;
            default:
                return callback(new PublicError(`Invalid File Format: ${file.mimetype}, ${ext}`));
        }

        const fileSizeInBytes = fs.statSync(file.path).size;
        if (fileSizeInBytes > sizeLimits[ext]) {
            return callback(new PublicError(`Uploaded file of size ${fileSizeInBytes / 1024} kB is bigger than the limit ${sizeLimits[ext] / 1024} kB`));
        }

        return callback(null);
    }

    return callback(new PublicError(`Invalid File Format: ${file.mimetype}, ${ext}`));
};
module.exports.validateFile = _validateFile;

/**
 * Get the derived keys from object.
 *
 * @param {array} keys
 * @param {object} obj
 * @param {string} prefix
 */
const deriveKeys = (keys, obj, prefix) => {
    if (Array.isArray(obj) && prefix === '') {
        return ['*'];
    }
    for (var key in obj) {
        if (Array.isArray(obj[key])) {
            let keyToPush;
            if (prefix === '') {
                keyToPush = key + '.*';
            } else {
                keyToPush = prefix + key + '.*';
            }
            if (keys.indexOf(keyToPush) === -1) {
                keys.push(keyToPush);
            }
        } else if (typeof obj[key] === 'object') {
            if (prefix === '') {
                keys.concat(deriveKeys(keys, obj[key], key + '.'));
            } else {
                keys.concat(deriveKeys(keys, obj[key], prefix + key + '.'));
            }
        }
    }
    return keys;
};
module.exports.deriveKeys = deriveKeys;
