const {
    first, flatten, forEach, forOwn, get, has, includes, isArray, isEmpty, isFunction, isPlainObject, map, max, min,
    pickBy, reduce, size, take, toString, transform, uniq, unset,
} = require('lodash');
const winston = require('winston');
const path = require('path');
const validator = require('validator');

const { Lazy_Shared_ProcessedRowObject_MongooseContext } = require('../../../../models/processed_row_objects');
const { aggregateProcessedRowObjects } = require('./aggregation.helpers');
const cached_values = require('../../../../models/cached_values');
const { newDataTypeCoercedValue, originalValue } = require('../../../../libs/datasources/datatypes');
const { fieldOverrideIfExists } = require('../../func');

const FILTER_GROUP_LIMIT = 200;
const FILTER_HAS_IMAGE = 'Has Image';
const FILTER_HAS_TITLE = 'Has Title';

module.exports = {
    addDefaultFilters,
    topUniqueFieldValuesForFiltering,
};

/**
 * @param {Object} dataSourceDescription
 * @param {Object[]} uniqueFieldValuesByFieldName
 */
function addDefaultFilters(dataSourceDescription, uniqueFieldValuesByFieldName) {
    const nin = ['', 'null', 'NULL'];

    if (has(dataSourceDescription.fe_filters.default, FILTER_HAS_IMAGE) && dataSourceDescription.fe_image.field) {
        dataSourceDescription.fe_filters.fabricated.unshift({
            choices: [{
                match: {
                    nin,
                    exist: true,
                    field: `rowParams.${dataSourceDescription.fe_image.field}`,
                },
                title: FILTER_HAS_IMAGE,
            }],
            title: FILTER_HAS_IMAGE,
        });

        uniqueFieldValuesByFieldName.unshift({
            name: FILTER_HAS_IMAGE,
            toggleable: true,
        });
    }

    if (has(dataSourceDescription.fe_filters.default, FILTER_HAS_TITLE)) {
        dataSourceDescription.fe_filters.fabricated.unshift({
            choices: [{
                match: {
                    nin,
                    exist: true,
                    field: `rowParams.${dataSourceDescription.objectTitle}`,
                },
                title: FILTER_HAS_TITLE,
            }],
            title: FILTER_HAS_TITLE,
        });
        uniqueFieldValuesByFieldName.unshift({
            name: FILTER_HAS_TITLE,
            toggleable: true,
        });
    }
}

/**
 * @param {Object} dataSourceDescription
 * @param {Object} filterObj
 * @param {Function} callback
 */
async function getFilters({ dataSourceDescription, filterObj }, callback) {
    const availableFields = getAvailableFields(dataSourceDescription);

    if (isEmpty(availableFields)) {
        return callback(null, {});
    }

    try {
        const { Model: processedRowObjects_mongooseModel } = Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
        const finalFilterObj = prepareFilterObj(dataSourceDescription, availableFields, filterObj);
        const filterObjLength = size(finalFilterObj);
        const query = getQuery(dataSourceDescription, finalFilterObj);
        const filterResults = await getFilterResults(finalFilterObj, availableFields, query, dataSourceDescription, processedRowObjects_mongooseModel);

        if (isEmpty(filterResults)) {
            const emptyCollections = reduce(availableFields, (result, fieldName) => {
                result[fieldName] = [];
                return result;
            }, {});

            return callback(null, emptyCollections);
        }

        // Display all available options for particular filter if only one filter is selected.
        if (filterObjLength === 1) {
            const modifiedResults = await appendSingleFilter(filterResults, finalFilterObj, dataSourceDescription);

            return callback(null, modifiedResults);
        }

        if (filterObjLength > 1) {
            const modifiedResults = await appendMultipleFilter(filterResults, finalFilterObj, query, dataSourceDescription, processedRowObjects_mongooseModel);

            return callback(null, modifiedResults);
        }
        callback(null, filterResults);
    } catch (err) {
        callback(err);
    }
}

function getUnwindValues({ customFieldsToProcess }, fields) {
    return customFieldsToProcess.reduce((acc, { fieldName }) => {
        if (fields.includes(fieldName)) {
            acc.push({ $unwind: { path: `$rowParams.${fieldName}`, preserveNullAndEmptyArrays: true } });
        }
        return acc;
    }, []);
}

/**
 * @param {Object} dataSourceDescription
 * @param {String} field
 * @param {String|String[]} value
 * @returns {String|Number|Date|Object|null}
 */
function getQueryValue(dataSourceDescription, field, value) {
    if (!isArray(value)) {
        return formatQueryValue(dataSourceDescription, field, value);
    }

    if (value.length === 1) {
        return formatQueryValue(dataSourceDescription, field, value[0]);
    }

    return { $in: value };
}

/**
 * @param {Object} raw_rowObjects_coercionScheme
 * @param {String} field
 * @param {String} value
 * @returns {String|Number|Date|null}
 */
function formatQueryValue({ raw_rowObjects_coercionScheme }, field, value) {
    if (!raw_rowObjects_coercionScheme[field]) {
        return value;
    }

    return newDataTypeCoercedValue(raw_rowObjects_coercionScheme[field], value);
}

/**
 * Prepare filter object by skipping hidden and non-filterable fields.
 * @param {Object} dataSourceDescription
 * @param {String[]} availableFields
 * @param {Object} filterObj
 * @returns {Object}
 */
function prepareFilterObj(dataSourceDescription, availableFields, filterObj) {
    return transform(filterObj, (result, value, key) => {
        if (includes(dataSourceDescription.fe_filters.fieldsAsRangeSlider, key) || isPlainObject(value)) {
            return result;
        }

        if (!availableFields.includes(key)) {
            return result;
        }

        result[key] = value;

        return result;
    });
}

/**
 * Prepare fields to select. Values are stored inside rowParams.
 * @param {Object} dataSourceDescription
 * @param {Object} filterObj
 * @returns {Object}
 */
function getQuery(dataSourceDescription, filterObj) {
    return transform(filterObj, (result, value, field) => {
        const unescapedValue = isArray(value) ? value.map(item => validator.unescape(item)) : validator.unescape(value);

        result[`rowParams.${field}`] = getQueryValue(dataSourceDescription, field, unescapedValue);
        return result;
    });
}

/**
 * Returns only multi selectable fields from filter object.
 * @param {Object} dataSourceDescription
 * @param {Object} filterObj
 * @returns {Object}
 */
function getMultiSelectableFilterObj(dataSourceDescription, filterObj) {
    if (isEmpty(dataSourceDescription.fe_filters.fieldsMultiSelectable)) {
        return {};
    }

    return pickBy(filterObj, (value, key) => {
        return dataSourceDescription.fe_filters.fieldsMultiSelectable.includes(key);
    });
}

/**
 * @param {String[]} fields
 * @param {String=} param
 * @returns {Object}
 */
function getSelectQuery(fields, param = 'rowParams') {
    return fields.reduce((result, field) => {
        result[`${param}.${field}`] = 1;

        return result;
    }, {});
}

/**
 * @param {String[]} fields
 * @returns {Object}
 */
function getAggregateValues(fields) {
    return fields.reduce((result, field) => {
        result[field] = {
            $addToSet: `$rowParams.${field}`,
        };

        return result;
    }, {});
}

function getProjectValues(fields, fieldsAsRangeSlider = []) {
    return fields.reduce((result, field) => {
        if (fieldsAsRangeSlider.includes(field)) {
            result[field] = `$${field}`;

            return result;
        }

        result[field] = {
            $slice: [`$${field}`, FILTER_GROUP_LIMIT],
        };

        return result;
    }, {});
}

/**
 * @param {Object} fe_excludeFields
 * @param {Object} fe_filters
 * @returns {String[]}
 */
function getAvailableFields({ fe_excludeFields, fe_filters }) {
    return reduce(fe_excludeFields, (fields, excluded, name) => {
        if (!excluded && !fe_filters.fieldsNotAvailable.includes(name)) {
            fields.push(name);
        }
        return fields;
    }, []);
}

/**
 * @param {Object} finalFilterObj
 * @param {String[]} availableFields
 * @param {Object} query
 * @param {Object} dataSourceDescription
 * @param {Object} model
 * @returns {Object}
 */
async function getFilterResults(finalFilterObj, availableFields, query, dataSourceDescription, model) {
    if (isEmpty(query) && isEmpty(dataSourceDescription.fe_filters.fieldsAsRangeSlider)) {
        return await getAllAvailableFilters(finalFilterObj, dataSourceDescription, availableFields);
    }

    return await getQueriedFilters(availableFields, query, dataSourceDescription, model);
}

async function getAllAvailableFilters(finalFilterObj, { _id }, availableFields) {
    const select = getSelectQuery(Object.keys(finalFilterObj), 'limitedUniqValsByColName');
    const cachedValues = await cached_values.findOne({ srcDocPKey: _id }, select).exec();

    const results = get(cachedValues, 'limitedUniqValsByColName', {});
    const filterResults = availableFields.reduce((acc, field) => {
        acc[field] = results[field];

        return acc;
    }, {});

    return transform(filterResults, (result, value, key) => {
        result[key] = take(value, FILTER_GROUP_LIMIT);

        return result;
    });
}

/**
 * @param {String[]} availableFields
 * @param {Object} query
 * @param {Object} dataSourceDescription
 * @param {Object} model
 * @returns {Promise<Object>}
 */
async function getQueriedFilters(availableFields, query, dataSourceDescription, model) {
    const unwindValues = getUnwindValues(dataSourceDescription, availableFields);
    const aggregateValues = getAggregateValues(availableFields);
    const projectValues = getProjectValues(availableFields, dataSourceDescription.fe_filters.fieldsAsRangeSlider);
    const aggregate = [
        { $match: query },
        ...unwindValues,
        { $group: { _id: null, ...aggregateValues } },
        { $project: { _id: 0, ...projectValues } },
    ];

    return first(await aggregateProcessedRowObjects(model, aggregate));
}

/**
 * @param {Object} filterResults
 * @param {Object} finalFilterObj
 * @param {ObjectID} _id
 * @returns {Promise<Object>}
 */
async function appendSingleFilter(filterResults, finalFilterObj, { _id }) {
    const [singleField] = Object.keys(finalFilterObj);
    const select = getSelectQuery([singleField], 'limitedUniqValsByColName');
    const cachedValues = await cached_values.findOne({ srcDocPKey: _id }, select).exec();
    const singleFilter = take(get(cachedValues, ['limitedUniqValsByColName', singleField], []), FILTER_GROUP_LIMIT);

    if (isEmpty(singleFilter)) {
        return filterResults;
    }

    return Object.assign({}, filterResults, {
        [singleField]: singleFilter,
    });
}

/**
 * @param {Object} filterResults
 * @param {Object} finalFilterObj
 * @param {Object} query
 * @param {Object} dataSourceDescription
 * @param {Object} model
 * @returns {Promise<Object>}
 */
async function appendMultipleFilter(filterResults, finalFilterObj, query, dataSourceDescription, model) {
    const multiSelectableFilterObj = getMultiSelectableFilterObj(dataSourceDescription, finalFilterObj);

    if (isEmpty(multiSelectableFilterObj)) {
        return filterResults;
    }

    const multiFields = Object.keys(multiSelectableFilterObj);
    const multiSelect = getSelectQuery(multiFields);
    let multiQuery = {};

    // Limit multi selectable fields only to found positions when user is searching by other fields.
    if (multiFields.length > 1 || multiFields.length !== size(finalFilterObj)) {
        const multiFields = dataSourceDescription.fe_filters.fieldsMultiSelectable.map(field => `rowParams.${field}`);

        multiQuery = pickBy(query, (value, key) => multiFields.includes(key));
        multiQuery = { $or: map(multiQuery, (value, key) => ({ [key]: value })) };
    }

    const multiValues = await model.find(multiQuery, multiSelect).limit(FILTER_GROUP_LIMIT).lean().exec();
    const multiFilterResults = multiValues.map(value => value.rowParams);
    const modifiedResults = Object.assign({}, filterResults);

    forEach(multiFilterResults, (row) => {
        forEach(row, (value, field) => {
            const flattenItem = isArray(value) ? flatten(value) : [toString(value)];
            modifiedResults[field].push(...flattenItem);
        });
    });

    forEach(modifiedResults, (value, field) => {
        modifiedResults[field] = take(uniq(value), FILTER_GROUP_LIMIT);
    });

    return modifiedResults;
}

function getActiveFiltersFunction(description) {
    let getFiltersFunction;
    if (description.permissions && description.permissions.includes('getCustomFilters')) {
        try {
            getFiltersFunction = require(path.join(__dirname, '/../../../../../user/', description._team.subdomain, '/src/controller')).getActiveFiltersFunction;
        } catch (e) {
            winston.warn(`No get filters function for team ${description._team.subdomain}`);
        }
    }

    return isFunction(getFiltersFunction) ? getFiltersFunction : getFilters;
}

function topUniqueFieldValuesForFiltering({ dataSourceDescription, filterObj = {} }, callback) {
    const getActiveFilters = getActiveFiltersFunction(dataSourceDescription);

    getActiveFilters({ dataSourceDescription, filterObj }, (err, uniqueFieldValuesByFieldName) => {
        if (err) {
            callback(err);
            return;
        }

        if (isEmpty(uniqueFieldValuesByFieldName)) {
            callback(null, []);
            return;
        }

        if (dataSourceDescription.fe_filters.fieldsAsRangeSlider) {
            forEach(uniqueFieldValuesByFieldName, function (value, key) {
                if (dataSourceDescription.fe_filters.fieldsAsRangeSlider.includes(key)) {
                    const minValue = min(value);
                    const maxValue = max(value);

                    if (minValue === maxValue) {
                        unset(uniqueFieldValuesByFieldName, key);
                    } else {
                        uniqueFieldValuesByFieldName[key] = [minValue, maxValue];
                    }
                }
            });
        }

        // Now insert fabricated filters
        if (dataSourceDescription.fe_filters.fabricated) {
            var fabricatedFilters_length = dataSourceDescription.fe_filters.fabricated.length;
            for (let i = 0; i < fabricatedFilters_length; i++) {
                const fabricatedFilter = dataSourceDescription.fe_filters.fabricated[i];
                const choices = fabricatedFilter.choices;
                const choices_length = choices.length;
                const values = [];
                for (let j = 0; j < choices_length; j++) {
                    const choice = choices[j];
                    values.push(choice.title);
                }
                if (typeof uniqueFieldValuesByFieldName[fabricatedFilter.title] !== 'undefined') {
                    const errStr = 'Unexpectedly already-existent filter for the fabricated filter title ' + fabricatedFilter.title;
                    winston.error('' + errStr);
                    callback(new Error(errStr), null);

                    return;
                }
                uniqueFieldValuesByFieldName[fabricatedFilter.title] = values;
            }
        }
        //
        // Now insert keyword filters
        if (dataSourceDescription.fe_filters.keywords) {
            var keywordFilters_length = dataSourceDescription.fe_filters.keywords.length;
            for (let i = 0; i < keywordFilters_length; i++) {
                const keywordFilter = dataSourceDescription.fe_filters.keywords[i];
                const choices = keywordFilter.choices;
                const choices_length = choices.length;
                const values = [];
                for (let j = 0; j < choices_length; j++) {
                    const choice = choices[j];
                    values.push(choice);
                }
                if (typeof uniqueFieldValuesByFieldName[keywordFilter.title] !== 'undefined') {
                    const errStr = 'Unexpectedly already-existent filter for the keyword filter title ' + keywordFilter.title;
                    winston.error('' + errStr);
                    callback(new Error(errStr), null);

                    return;
                }
                uniqueFieldValuesByFieldName[keywordFilter.title] = values.sort();
            }
        }

        var finalizedUniqueFieldValuesByFieldName = [];

        forOwn(uniqueFieldValuesByFieldName, function (columnValue, columnName) {
            /* getting illegal values list */
            var illegalValues = [];

            if (dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey) {

                if (dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey._all) {
                    illegalValues = illegalValues.concat(dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey._all);
                }
                var illegalValuesForThisKey = dataSourceDescription.fe_filters.valuesToExcludeByOriginalKey[columnName];

                if (illegalValuesForThisKey) {
                    illegalValues = illegalValues.concat(illegalValuesForThisKey);
                }

            }

            var raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
            var revertType = false;
            var overwriteValue = false;

            var row = columnValue.slice();
            if (raw_rowObjects_coercionSchema && raw_rowObjects_coercionSchema[columnName]) {
                row = [];
                revertType = true;
            }

            let oneToOneOverrideWithValuesByTitleByFieldName = [];

            if (typeof dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName !== 'undefined' &&
                dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[columnName]) {
                oneToOneOverrideWithValuesByTitleByFieldName = dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName[columnName];
                overwriteValue = true;
            }

            var spliceCount = 0;

            columnValue.forEach(function (rowValue, index) {

                if (rowValue === null || typeof rowValue === 'undefined' || rowValue === '') {
                    return;
                }

                var existsInIllegalValueList = illegalValues.indexOf(rowValue);

                if (existsInIllegalValueList === -1) {

                    if (revertType) {
                        row.push(originalValue(raw_rowObjects_coercionSchema[columnName], rowValue));
                        index = row.length - 1;
                    }

                    if (overwriteValue) {
                        var valueByOverride = oneToOneOverrideWithValuesByTitleByFieldName.find(function (item) {
                            return item.value === rowValue;
                        });

                        if (valueByOverride) {
                            row[index] = valueByOverride.override;
                        }
                    }
                } else {
                    if (!revertType) {
                        row.splice(index - spliceCount, 1);
                        spliceCount++;
                    }
                }
            });

            // Sort by integer
            if (dataSourceDescription.fe_filters.fieldsSortableByInteger &&
                dataSourceDescription.fe_filters.fieldsSortableByInteger.indexOf(columnName) !== -1) {

                row.sort(function (a, b) {
                    a = a.replace(/\D/g, '');
                    a = a === '' ? 0 : Number.parseInt(a);
                    b = b.replace(/\D/g, '');
                    b = b === '' ? 0 : Number.parseInt(b);
                    return a - b;
                });

            } else if (raw_rowObjects_coercionSchema[columnName] &&
                raw_rowObjects_coercionSchema[columnName].operation === 'ToDate') {

                if (!dataSourceDescription.fe_filters.fieldsAsRangeSlider || !dataSourceDescription.fe_filters.fieldsAsRangeSlider.includes(columnName)) {
                    row.sort(function (a, b) {
                        var dateA = new Date(a);
                        var dateB = new Date(b);
                        return dateA > dateB ? 1 : -1;
                    });
                }

            } else if (((raw_rowObjects_coercionSchema[columnName] &&
                raw_rowObjects_coercionSchema[columnName].operation !== 'ToFloat' &&
                raw_rowObjects_coercionSchema[columnName].operation !== 'ToInteger') &&
                raw_rowObjects_coercionSchema[columnName].operation !== 'ToPercent') ||
                !raw_rowObjects_coercionSchema[columnName]) {

                row.sort(function (a, b) {
                    if (a !== null && b !== null) {
                        var A = a.toString().toUpperCase();
                        var B = b.toString().toUpperCase();

                        if (A < B) {
                            return -1;
                        }
                        if (A > B) {
                            return 1;
                        }
                    }

                    // names must be equal
                    return 0;
                });
            } else {
                row.sort(function (a, b) {
                    return a - b;
                });
            }

            // Sort in reverse order
            if (dataSourceDescription.fe_filters.fieldsSortableInReverseOrder &&
                dataSourceDescription.fe_filters.fieldsSortableInReverseOrder.indexOf(columnName) !== -1) {
                row.reverse();
            }

            finalizedUniqueFieldValuesByFieldName.push({
                name: columnName,
                coercionScheme: raw_rowObjects_coercionSchema[columnName] ? raw_rowObjects_coercionSchema[columnName] : undefined,
                values: row,
            });
        });

        if (dataSourceDescription.fe_fieldDisplayOrder && dataSourceDescription.fe_fieldDisplayOrder.length) {

            // Sort filter groups by custom sort order
            finalizedUniqueFieldValuesByFieldName.sort(function (a, b) {
                return (
                    dataSourceDescription.fe_fieldDisplayOrder.indexOf(a.name) -
                    dataSourceDescription.fe_fieldDisplayOrder.indexOf(b.name)
                );
            });

        } else {

            // Sort filter groups alphabetically
            finalizedUniqueFieldValuesByFieldName.sort(function (a, b) {
                var nameA = a.name;
                var nameB = b.name;

                if (dataSourceDescription.fe_displayTitleOverrides) {

                    nameA = fieldOverrideIfExists(nameA, dataSourceDescription);
                    nameB = fieldOverrideIfExists(nameB, dataSourceDescription);
                }

                nameA = nameA.toUpperCase();
                nameB = nameB.toUpperCase();

                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }

                // names must be equal
                return 0;
            });

        }

        callback(null, finalizedUniqueFieldValuesByFieldName);
    });
}
