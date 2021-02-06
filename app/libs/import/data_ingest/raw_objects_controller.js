const _ = require('lodash');
const parse = require('csv-parse');
const es = require('event-stream');
const winston = require('winston');
const JSONStream = require('JSONStream');
const AutoDetectDecoderStream = require('autodetect-decoder-stream');

const datatypes = require('../../datasources/datatypes');
const raw_row_objects = require('../../../models/raw_row_objects');
const raw_source_documents = require('../../../models/raw_source_documents');
const flattenHelpers = require('../../../controllers/api/dataset/flatten-helpers');
const { fieldDelimiter } = require('../../../controllers/api/dataset/nested');
const { getFileStream } = require('../../../controllers/api/dataset/save-helpers');
const { formatColumnName, formatRawValues } = require('../../../utils/helpers');

const _new_parsed_StringDocumentObject_fromDataSourceDescription = async function (job, dataSourceIsIndexInList, description, sourceDocumentTitle, datasetId, fileType, fn) {
    const title = description.title;
    const parentId = description.schemaId;

    let srcDocPKey = datasetId;
    let insertTo = datasetId;

    if (parentId) {
        insertTo = parentId;
        srcDocPKey = parentId;
    }

    if (description.lastImportTriggeredBy === 'automated') {
        insertTo = `${insertTo}-automated`;
    }

    const delimiter = fileType === 'TSV' ? '\t' : ',';

    const importingMessage = `${dataSourceIsIndexInList}: Importing ${fileType} "${title}"`;
    const parentMessage = parentId ? ` (appended dataset, parent: ${parentId})` : '';

    winston.info(`${importingMessage}${parentMessage}`);

    job.log(`🔁  Importing ${fileType} "${title}"`);

    const raw_rowObjects_coercionScheme = description.raw_rowObjects_coercionScheme; // look up data type scheme here

    // To solve a memory overflow issue to hold entire large files, splitted them out by each line
    let lineNr = 0;
    let columnNames = [];
    const parsed_rowObjectsById = {};
    const parsed_orderedRowObjectPrimaryKeys = [];
    let cachedLines = '';
    let numberOfRows_inserted = 0;

    const parser = function (columnNamesAndThenRowObject) {
        // replace any dotted fields with underscores, e.g. comics.items to comics_items
        // column names
        if (lineNr === 1) {
            let numberOfEmptyFields = 0;
            for (let i = 0; i < columnNamesAndThenRowObject.length; i++) {
                // because both this and the sample generation is looping through the csv in order, we can safely
                // assume that the fields will all still be in the same order. Therefore, whatever we named Field1 when
                // generating sample, will still match Field1 here. If we change that logic, this may no longer be
                // effective.

                // change any empty string keys to "Field"
                if (_.isEmpty(columnNamesAndThenRowObject[i])) {
                    numberOfEmptyFields++;
                    columnNamesAndThenRowObject[i] = `Field ${numberOfEmptyFields}`;
                }
                columnNamesAndThenRowObject[i] = formatColumnName(columnNamesAndThenRowObject[i]);
            }

            columnNames = columnNamesAndThenRowObject;
        } else {
            // row objects
            //
            // skip empty rows
            if (columnNamesAndThenRowObject.every(column => column === '')) {
                winston.error('Row is empty - skipping.');
                job.log('Error: Row is empty - skipping.');
                return;
            }

            // some csv's have a comma at the end of the row, pop out if that's the case
            if (columnNamesAndThenRowObject.length !== columnNames.length && columnNamesAndThenRowObject[columnNamesAndThenRowObject.length - 1] === '') {
                columnNamesAndThenRowObject.pop();
            }

            if (columnNamesAndThenRowObject.length !== columnNames.length) {
                const rowMessage = `Row has different number of values than number of ${fileType}'s number of columns.`;

                winston.error(rowMessage);
                job.log(`Error: ${rowMessage}`);
                // automatically add empty fields if there are more columnNames than what's in the row
                let difference = columnNames.length - columnNamesAndThenRowObject.length;
                if (difference > 0) {
                    while (difference) {
                        columnNamesAndThenRowObject += delimiter;
                        difference--;
                    }
                } else {
                    throw new Error(`Error when processing ${fileType}. Number of columns at line ${lineNr}` +
                        ` is ${columnNamesAndThenRowObject.length} and not ${columnNames.length}.`);
                }
            }
            const rowObject = {};

            for (let columnIndex = 0; columnIndex < columnNames.length; columnIndex++) {
                const columnName = formatColumnName(`${columnNames[columnIndex]}`);
                const rowValue = formatRawValues(columnNamesAndThenRowObject[columnIndex]);
                let typeFinalized_rowValue = rowValue;

                // now do type coercion/parsing here with functions to finalize
                if (!_.isEmpty(raw_rowObjects_coercionScheme)) {
                    const coercionSchemeForKey = raw_rowObjects_coercionScheme[columnName];

                    if (!_.isNil(coercionSchemeForKey) && coercionSchemeForKey.operation) {
                        typeFinalized_rowValue = datatypes.newDataTypeCoercedValue(coercionSchemeForKey, rowValue);
                    }
                }
                rowObject[columnName] = typeFinalized_rowValue; // Now store the finalized value
            }

            const rowObject_primaryKey = parentId ? `${datasetId}-${lineNr - 1}` : `${lineNr - 1}`;
            const parsedObject = raw_row_objects.New_templateForPersistableObject(rowObject_primaryKey, srcDocPKey, rowObject);

            if (!_.isNil(parsed_rowObjectsById[rowObject_primaryKey])) {
                winston.debug(parsed_rowObjectsById[rowObject_primaryKey]);
                winston.info('Warning: An object with the same primary key, "' +
                    rowObject_primaryKey +
                    '" was already found in the parsed row objects cache on import.' +
                    ' Use the primary key function to further disambiguate primary keys. Skipping importing this row, .');
                return;
            }
            parsed_rowObjectsById[rowObject_primaryKey] = parsedObject;
            parsed_orderedRowObjectPrimaryKeys.push(rowObject_primaryKey);
        }
    };

    let readStream;

    try {
        readStream = await getFileStream(description);
    } catch (err) {
        return fn(err);
    }

    const handleError = (err) => {
        winston.error('Error encountered while trying to open file. The file might not yet exist.');

        return fn(err);
    };

    const handleEnd = () => {
        const savedMessage = `Saved ${lineNr} lines of document: `;

        // If we have any lines remaining, need to store document to the db.
        if (lineNr % 1000 === 0) {
            winston.info(savedMessage, sourceDocumentTitle);
            job.log(savedMessage, sourceDocumentTitle);

            const stringDocumentObject = raw_source_documents.New_templateForPersistableObject(insertTo, numberOfRows_inserted);
            const append = !!parentId;

            raw_source_documents.UpsertWithOnePersistableObjectTemplate(append, stringDocumentObject, fn);

        } else {
            raw_row_objects.InsertManyPersistableObjectTemplates(parsed_orderedRowObjectPrimaryKeys, parsed_rowObjectsById, insertTo, sourceDocumentTitle, function (err) {
                if (err) {
                    winston.error('An error while saving raw row objects: ', err);
                    return fn(err);
                }

                winston.info(savedMessage, sourceDocumentTitle);
                job.log(savedMessage, sourceDocumentTitle);

                numberOfRows_inserted += parsed_orderedRowObjectPrimaryKeys.length;

                const stringDocumentObject = raw_source_documents.New_templateForPersistableObject(insertTo, numberOfRows_inserted);
                const append = !!parentId;

                raw_source_documents.UpsertWithOnePersistableObjectTemplate(append, stringDocumentObject, fn);
            });
        }
    };

    const lineNotification = () => {
        if (lineNr % 1000 === 0) {
            const parsingMessage = `Parsing ${lineNr} rows in "${title}"`;

            winston.info(parsingMessage);
            job.log(parsingMessage);
        }
    };

    if (fileType === 'JSON') {
        var jsonParser = JSONStream.parse(description.JSONPath);

        readStream = readStream.pipe(jsonParser)
            .on('data', function (output) {
                readStream.pause();

                if (!output) {
                    return;
                }

                //Flatten the data. It could happen that from a single element an array of elements will be created.
                output = flattenHelpers.flatten(output, fieldDelimiter);
                _.forEach(output, (element) => {
                    const lineUid = lineNr;

                    lineNr += 1;

                    const rowObject_primaryKey = `${lineUid}`;
                    const columnNames = Object.keys(element);

                    for (let i = 0; i < columnNames.length; i++) {
                        const columnName = columnNames[i];
                        const columnValue = element[columnName];

                        if (!_.isEmpty(raw_rowObjects_coercionScheme)) {
                            const coercionSchemeForKey = raw_rowObjects_coercionScheme[columnName];

                            if (!_.isNil(coercionSchemeForKey) && coercionSchemeForKey.operation) {
                                element[columnName] = datatypes.newDataTypeCoercedValue(coercionSchemeForKey, columnValue);
                            }
                        }
                    }

                    const parsedObject = raw_row_objects.New_templateForPersistableObject(rowObject_primaryKey, datasetId, element);

                    if (!_.isNil(parsed_rowObjectsById[rowObject_primaryKey])) {
                        winston.warn(`An object with the same primary key, "${rowObject_primaryKey}" was already found in the parsed row objects cache on import.` +
                            ' Use the primary key function to further disambiguate primary keys. Skipping importing this row, .');
                    }

                    parsed_rowObjectsById[rowObject_primaryKey] = parsedObject;
                    parsed_orderedRowObjectPrimaryKeys.push(rowObject_primaryKey);

                    lineNotification();
                });

                readStream.resume();
            })
            .on('error', handleError)
            .on('end', handleEnd);

    } else {
        readStream = readStream
            .pipe(new AutoDetectDecoderStream())
            .pipe(es.split(/\n|\r/))
            .pipe(es.mapSync(function (line) {
                // pause the readstream
                readStream.pause();

                if (line.indexOf('[ . . . ]') >= 0) {
                    line = line.replace(/\[\s\.\s\.\s\.\s\]/g, '');
                    line += '<br />';
                }

                lineNr += 1;

                parse(cachedLines + line, {
                    delimiter,
                    relax: true,
                    skip_empty_lines: true,
                }, function (err, output) {
                    if (err || !output || output.length === 0) {
                        cachedLines += line;
                        return readStream.resume();
                    }

                    cachedLines = '';

                    try {
                        parser(output[0]);
                    } catch (e) {
                        winston.error(`An error when parsing raw object: ${e}`);
                        return fn(e);
                    }

                    lineNotification();

                    readStream.resume();
                });
            }))
            .on('error', handleError)
            .on('end', handleEnd);
    }
};

module.exports.ParseAndImportRaw = function (indexInList, dataSourceDescription, job, callback) {
    const { title, _id: datasetId, format } = dataSourceDescription;
    const acceptableFormats = ['CSV', 'TSV', 'JSON'];

    if (acceptableFormats.includes(format)) {
        _new_parsed_StringDocumentObject_fromDataSourceDescription(job, indexInList, dataSourceDescription, title, datasetId, format, function (err) {
            if (err) {
                return callback(err);
            }
            winston.info('Saved document: ', title);
            return callback(null);
        });
    } else {
        const errorMessage = `Unrecognized data source format "${format}".`;

        winston.error(errorMessage);
        callback(new Error(errorMessage));
    }
};
