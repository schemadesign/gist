const winston = require('winston');
const moment = require('moment');
const _ = require('lodash');
const validator = require('validator');
const parseCurrency = require('parsecurrency');

const importedDataPreparation = require('../../libs/datasources/imported_data_preparation');
const datatypes = require('../../libs/datasources/datatypes');
const { formatFieldValue } = require('../../../shared/fields');
const { isEmbed } = require('../../utils/helpers');
const { isNumber, PERCENT_UNIT } = require('./config');

const percentMultiplier = value => Math.round(value * 1000) / 10;

module.exports.percentMultiplier = percentMultiplier;
module.exports.unitMultiplier = (value, units) => (value && units === PERCENT_UNIT ? percentMultiplier(value) : value);

module.exports.stringFormat = value => `${value}`;
module.exports.percentFormat = value => `${percentMultiplier(value)}%`;

const decodeHtmlEntity = item =>
    item
        .replace(/&(amp;)*#x(\w+);/gi, match => {
            const code = match.replace(/(&|amp|#x|;)+/gi, '');

            return decodeURIComponent(`%${code}`);
        })
        .replace(/&amp;(amp;)*/gi, '&');

module.exports.decodeHtmlEntity = decodeHtmlEntity;

const _findItemInArrayOfObject = function (ArrayOfObj, targetKey) {
    if (typeof ArrayOfObj !== 'undefined' && Array.isArray(ArrayOfObj)) {
        for (let i = 0; i < ArrayOfObj.length; i++) {
            const currentKey = ArrayOfObj[i].key;
            if (currentKey === targetKey) {
                return ArrayOfObj[i];
            }
        }
    }

    return null;
};

module.exports.findItemInArrayOfObject = _findItemInArrayOfObject;

function convertArrayObjectToObject(ArrayOfObj) {
    const obj = {};
    _.forEach(ArrayOfObj, ({ value, key }) => {
        obj[key] = value;
    });
    return obj;
}

module.exports.convertArrayObjectToObject = convertArrayObjectToObject;

const _urlQueryByAppendingQueryStringToExistingQueryString = function (existingQueryString, queryStringToAppend) {
    let newWholeQueryString = existingQueryString;
    if (existingQueryString.length === 0) {
        newWholeQueryString += '?';
    } else {
        newWholeQueryString += '&';
    }
    newWholeQueryString += queryStringToAppend;

    return newWholeQueryString;
};
module.exports.urlQueryByAppendingQueryStringToExistingQueryString = _urlQueryByAppendingQueryStringToExistingQueryString;

const _activeSearch_matchOp_orErrDescription = function (dataSourceDescription, searchCol, searchQuery, isFilter = false) {
    let searchQ = _.isArray(searchQuery)
        ? searchQuery.map(query => validator.unescape(query))
        : validator.unescape(searchQuery);

    const realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(
        searchCol,
        dataSourceDescription,
    );
    const realColumnNamePath = 'rowParams.' + realColumnName;

    let matchOp = { $match: {} };

    const raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;

    const fieldTypes = {};
    const fieldTypeOperation = _.get(raw_rowObjects_coercionSchema, [realColumnName, 'operation']);

    fieldTypes.isDate = fieldTypeOperation === 'ToDate';
    fieldTypes.isInteger = fieldTypeOperation === 'ToInteger';
    fieldTypes.isCurrency = fieldTypeOperation === 'ToCurrency';
    fieldTypes.isFloat = fieldTypeOperation === 'ToFloat' || fieldTypeOperation === 'ToPercent';
    fieldTypes.isPercent = fieldTypeOperation === 'ToPercent';

    // Default Search - all string & custom delimited fields
    if (searchCol === 'All Fields') {
        matchOp = { $match: { $or: [] } };
        // Add string fields to query
        for (var field in dataSourceDescription.raw_rowObjects_coercionScheme) {
            if (
                !dataSourceDescription.fe_excludeFields[field] &&
                dataSourceDescription.raw_rowObjects_coercionScheme[field].operation === 'ToString'
            ) {
                matchOp['$match']['$or'].push({
                    ['rowParams.' + field]: {
                        $regex: searchQ,
                        $options: 'i',
                    },
                });
            }
        }
        // Add custom delimited fields to query
        _.forEach(dataSourceDescription.customFieldsToProcess, function (field) {
            if (!dataSourceDescription.fe_excludeFields[field.fieldName] && field.fieldType === 'array') {
                matchOp['$match']['$or'].push({
                    ['rowParams.' + field.fieldName]: {
                        $regex: searchQ,
                        $options: 'i',
                    },
                });
            }
        });

        return { matchOps: [matchOp] };
    }

    const parseByFieldTypes = (q, fieldTypes) => {
        if (fieldTypes.isInteger) {
            return parseInt(q, 10);
        } else if (fieldTypes.isCurrency) {
            const searchQCurrency = parseCurrency(q);
            return searchQCurrency.value;
        } else if (fieldTypes.isFloat || fieldTypes.isPercent) {
            return parseFloat(q);
        } else {
            // existing search logic for strings
            return isFilter ? q : {
                $regex: q,
                $options: 'i',
            };
        }
    };

    // Search by selected field
    if (!fieldTypes.isDate) {
        if (Array.isArray(searchQ)) {
            const match = searchQ.map(q => {
                return { [realColumnNamePath]: parseByFieldTypes(q, fieldTypes) };
            });

            matchOp['$match']['$or'] = match;
        } else {
            matchOp['$match'][realColumnNamePath] = parseByFieldTypes(searchQ, fieldTypes);
        }
    } else {
        let realSearchValueMin, realSearchValueMax, searchDate;
        if (Array.isArray(searchQ)) {
            const match = [];
            for (let i = 0; i < searchQ.length; i++) {
                searchDate = moment.utc('' + searchQ[i]);
                if (searchDate.isValid()) {
                    realSearchValueMin = searchDate.startOf('day').toDate();
                    if (searchQ[i].length === 4) {
                        // Year
                        realSearchValueMax = searchDate
                            .startOf('year')
                            .add(1, 'years')
                            .toDate();
                    } else if (searchQ[i].length < 8) {
                        // Month
                        realSearchValueMax = searchDate
                            .startOf('month')
                            .add(1, 'months')
                            .toDate();
                    } else {
                        // Day
                        realSearchValueMax = searchDate
                            .startOf('day')
                            .add(1, 'days')
                            .toDate();
                    }
                } else {
                    // Invalid Date
                    return { err: 'Invalid Date' };
                }
                const obj = {};
                obj[realColumnNamePath] = {
                    $gte: realSearchValueMin,
                    $lt: realSearchValueMax,
                };
                match.push(obj);
            }
            matchOp['$match']['$or'] = match;
        } else {
            searchQ = '' + searchQ;
            // sometimes the searchDate is formatted as the format (bubble chart), outputFormat (gallery/table) and
            // sometimes it's in utc format already (barchart)
            searchDate = _formatSearchDate(
                searchQ,
                raw_rowObjects_coercionSchema[realColumnName].format,
                raw_rowObjects_coercionSchema[realColumnName].outputFormat,
            );

            if (searchDate.isValid()) {
                const possibleDurations = {
                    years: 'YYYY',
                    months: 'MMM YYYY',
                    days: 'MM-DD-YYYY',
                };

                let addDuration = 'days';

                for (let duration in possibleDurations) {
                    const durationFormat = possibleDurations[duration];
                    if (moment(searchQ, durationFormat, true).isValid()) {
                        addDuration = duration;
                    }
                }

                realSearchValueMin = searchDate.startOf('day').toDate();
                realSearchValueMax = searchDate
                    .startOf('day')
                    .add(1, addDuration)
                    .toDate();

                // checking searchQ length is bad - the searchQ length can't be counted on to be consistent
                // if the date is M/D/YY
                // or M/DD/YY
                // or MM/D/YY etc...
                // it filters by the entire month rather than the specific date
                // if user is filtering by a specific date, I don't see why we'd want to add more general time frame
                // commenting out for now but it will need to be tested pretty thoroughly

                // realSearchValueMin = searchDate.startOf('day').toDate();
                // if (searchQ.length == 4) { // Year
                //     realSearchValueMax = searchDate.startOf('year').add(1, 'years').toDate();
                // } else if (searchQ.length < 8) { // Month
                //     realSearchValueMax = searchDate.startOf('month').add(1, 'months').toDate();
                // } else { // Day
                //     realSearchValueMax = searchDate.startOf('day').add(1, 'days').toDate();
                // }

                matchOp['$match'][realColumnNamePath] = {
                    $gte: realSearchValueMin,
                    $lt: realSearchValueMax,
                };
            } else {
                // Invalid Date
                // return { err: 'Invalid Date' };

                // Prevent Internal Server Error message
                matchOp['$match'][realColumnNamePath] = {
                    $gte: '0001-01-01T00:00:00.000Z',
                    $lt: '0001-01-01T00:00:00.000Z',
                };
            }
        }
    }

    const groupOp = {
        $group: {
            _id: '$_id',
            pKey: { $first: '$pKey' },
            srcDocPKey: { $first: '$srcDocPKey' },
            rowParams: { $first: '$rowParams' },
        },
    };

    return { matchOps: [matchOp, groupOp] };
};
module.exports.activeSearch_matchOp_orErrDescription = _activeSearch_matchOp_orErrDescription;

const _activeFilterOR_matchCondition_orErrDescription = function (dataSourceDescription, filterCol, filterVal) {
    let matchConditions;
    let isAFabricatedFilter = false; // finalize
    if (dataSourceDescription.fe_filters.fabricated) {
        const fabricatedFilters_length = dataSourceDescription.fe_filters.fabricated.length;
        for (var i = 0; i < fabricatedFilters_length; i++) {
            const fabricatedFilter = dataSourceDescription.fe_filters.fabricated[i];
            if (fabricatedFilter.title === filterCol) {
                isAFabricatedFilter = true;
                // Now find the applicable filter choice
                const choices = fabricatedFilter.choices;
                const choices_length = choices.length;

                for (let k = 0; k < filterVal.length; k++) {
                    let foundChoice = false;
                    for (let j = 0; j < choices_length; j++) {
                        const choice = choices[j];
                        if (choice.title === filterVal[k]) {
                            foundChoice = true;

                            const reformQuery = {};

                            reformQuery[choice['match'].field] = {
                                $exists: choice['match'].exist,
                                $nin: choice['match'].nin,
                            };

                            matchConditions = [{ $match: reformQuery }];

                            break; // found the applicable filter choice
                        }
                    }
                    if (foundChoice === false) {
                        // still not found despite the filter col being recognized as fabricated
                        return { err: new Error('No such choice "' + filterVal + '" for filter ' + filterCol) };
                    }
                }

                break; // found the applicable fabricated filter
            }
        }
    }

    if (isAFabricatedFilter === true) {
        // already obtained matchConditions just above
        if (typeof matchConditions === 'undefined') {
            return { err: new Error('Unexpectedly missing matchConditions given fabricated filter…') };
        }
    } else {
        const realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(
            filterCol,
            dataSourceDescription,
        );

        // To coercion the date field into the valid date
        const raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
        const isDate =
            raw_rowObjects_coercionSchema &&
            raw_rowObjects_coercionSchema[realColumnName] &&
            raw_rowObjects_coercionSchema[realColumnName].operation === 'ToDate';

        if (!isDate) {
            for (var i = 0; i < filterVal.length; i++) {
                let realFilterValue = filterVal[i]; // To finalize in case of override…
                const oneToOneOverrideWithValuesByTitleByFieldName =
                    dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName || {};
                const oneToOneOverrideWithValuesByTitle_forThisColumn =
                    oneToOneOverrideWithValuesByTitleByFieldName[realColumnName];
                if (oneToOneOverrideWithValuesByTitle_forThisColumn) {
                    const valueByOverride = oneToOneOverrideWithValuesByTitle_forThisColumn.find(function (
                        valueByOverride,
                    ) {
                        return valueByOverride.override === realFilterValue;
                    });

                    if (typeof valueByOverride === 'undefined') {
                        const errString =
                            'Missing override value for overridden column ' +
                            realColumnName +
                            ' and incoming filterVal ' +
                            filterVal;
                        winston.error('' + errString); // we'll just use the value they entered - maybe a user is
                        // manually editing the URL
                    } else {
                        realFilterValue = valueByOverride.value;
                    }
                }
                if (typeof realFilterValue === 'string') {
                    // We need to consider that the search column might be array
                    // escape Mongo reserved characters in Mongo
                    realFilterValue = realFilterValue.replace(/[\^$\\.*+?()[\]{}|]/g, '\\$&');
                } else {
                    realFilterValue = '' + realFilterValue;
                }
                filterVal[i] = realFilterValue;
            }
        }

        matchConditions = _activeSearch_matchOp_orErrDescription(dataSourceDescription, realColumnName, filterVal, true)
            .matchOps;
    }

    if (typeof matchConditions === 'undefined') {
        throw new Error('Undefined match condition');
    }

    return { matchConditions: matchConditions };
};
module.exports.activeFilterOR_matchCondition_orErrDescription = _activeFilterOR_matchCondition_orErrDescription;

const _activeFilter_matchCondition_orErrDescription = (dataSourceDescription, filterCol, filterVal) => {
    let matchConditions;
    let isAFabricatedFilter = false; // finalize
    if (dataSourceDescription.fe_filters.fabricated) {
        const fabricatedFilters_length = dataSourceDescription.fe_filters.fabricated.length;

        for (let i = 0; i < fabricatedFilters_length; i++) {
            let fabricatedFilter = dataSourceDescription.fe_filters.fabricated[i];
            if (fabricatedFilter.title === filterCol) {
                isAFabricatedFilter = true;
                // Now find the applicable filter choice
                const choices = fabricatedFilter.choices;
                const choices_length = choices.length;
                let foundChoice = false;

                for (let j = 0; j < choices_length; j++) {
                    let choice = choices[j];
                    if (choice.title === filterVal) {
                        foundChoice = true;
                        let reformQuery = {};
                        let nin = [];
                        // catching user input for null and empty string
                        choice['match'].nin.map(function (ninField) {
                            if (ninField === 'null') {
                                nin.push(null);
                            } else if (ninField === '""') {
                                nin.push('');
                            } else {
                                nin.push(ninField);
                            }
                        });

                        reformQuery[choice['match'].field] = {
                            $exists: choice['match'].exist,
                            $nin: nin,
                        };

                        matchConditions = [{ $match: reformQuery }];
                        break; // found the applicable filter choice
                    }
                }
                if (foundChoice === false) {
                    // still not found despite the filter col being recognized as fabricated
                    return { err: new Error('No such choice "' + filterVal + '" for filter ' + filterCol) };
                }
                break; // found the applicable fabricated filter
            }
        }
    }

    if (isAFabricatedFilter === true) {
        // already obtained matchConditions just above
        if (typeof matchConditions === 'undefined') {
            return { err: new Error('Unexpectedly missing matchConditions given fabricated filter…') };
        }
    } else {
        const realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(
            filterCol,
            dataSourceDescription,
        );
        let realFilterValue = filterVal; // To finalize in case of override…
        // To coercion the date field into the valid date
        const raw_rowObjects_coercionSchema = dataSourceDescription.raw_rowObjects_coercionScheme;
        const isDate =
            raw_rowObjects_coercionSchema &&
            raw_rowObjects_coercionSchema[realColumnName] &&
            raw_rowObjects_coercionSchema[realColumnName].operation === 'ToDate';

        if (!isDate) {
            const overrides = dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName || {};
            const fieldNameOverrides = overrides[realColumnName];
            if (fieldNameOverrides) {
                const valueByOverride = fieldNameOverrides.find(singleValue => singleValue.override === filterVal);

                if (typeof valueByOverride === 'undefined') {
                    winston.error(
                        `Missing override value for overridden column ${realColumnName} and incoming filterVal ${filterVal}`,
                    ); // we'll just use the value they entered - maybe a user is manually editing the URL
                } else {
                    realFilterValue = valueByOverride.value;
                }
            }
            if (typeof realFilterValue === 'string') {
                // We need to consider that the search column might be array
                // escape Mongo reserved characters in Mongo
                realFilterValue = realFilterValue.replace(/[\^$\\.*+?()[\]{}|]/g, '\\$&');

                // assert position at beginning/end of string so substrings aren't matched
                // ie. don't return "male" values if filtering by "female"
                realFilterValue = `^${realFilterValue}$`;
            } else {
                realFilterValue = '' + realFilterValue;
            }

            matchConditions = _activeSearch_matchOp_orErrDescription(
                dataSourceDescription,
                realColumnName,
                realFilterValue,
            ).matchOps;
        } else {
            matchConditions = _activeSearch_matchOp_orErrDescription(dataSourceDescription, realColumnName, filterVal)
                .matchOps;
        }
    }
    if (typeof matchConditions === 'undefined') {
        throw new Error('Undefined match condition');
    }

    return { matchConditions: matchConditions };
};
module.exports.activeFilter_matchCondition_orErrDescription = _activeFilter_matchCondition_orErrDescription;

const _activeFilter_matchOp_orErrDescription_fromMultiFilter = function (dataSourceDescription, filterObj) {
    const filterColsRaw = Object.keys(filterObj);
    const filterCols = filterColsRaw.map(decodeHtmlEntity);
    const countFilterCols = filterCols.length;
    let conditions = [];

    if (!countFilterCols) {
        return { err: new Error('No active filter despite filterObj') };
    }

    for (let i = 0; i < countFilterCols; i++) {
        const filterColRaw = filterColsRaw[i];
        const filterCol = filterCols[i];
        const filterVal = filterObj[filterColRaw];
        let matchConditions = {};

        if (filterVal === '') {
            winston.warn(`No filter value for column: ${filterCol}`);
            break;
        } else if (_.isString(filterVal) || _.isNumber(filterVal)) {
            matchConditions = _activeFilter_matchCondition_orErrDescription(
                dataSourceDescription,
                filterCol,
                filterVal,
            );
        } else if (filterVal.min !== undefined || filterVal.max !== undefined) {
            const filterMinVal = validator.unescape(filterVal.min);
            const filterMaxVal = validator.unescape(filterVal.max);
            matchConditions = _activeFilterRange_matchCondition_orErrDescription(
                dataSourceDescription,
                filterCol,
                filterMinVal,
                filterMaxVal,
            );
        } else if (Array.isArray(filterVal)) {
            matchConditions = _activeFilterOR_matchCondition_orErrDescription(
                dataSourceDescription,
                filterCol,
                filterVal,
            );
        } else {
            // TODO - ERROR - Unexpected format
        }
        if (typeof matchConditions.err !== 'undefined') {
            return { err: matchConditions.err };
        }

        conditions = conditions.concat(matchConditions.matchConditions);
    }

    return { matchOps: conditions };
};

module.exports.activeFilter_matchOp_orErrDescription_fromMultiFilter = _activeFilter_matchOp_orErrDescription_fromMultiFilter;

const _activeFilterRange_matchCondition_orErrDescription = function (
    dataSourceDescription,
    filterCol,
    filterValMin,
    filterValMax,
) {
    const realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(
        filterCol,
        dataSourceDescription,
    );
    const realColumnNamePath = 'rowParams.' + realColumnName;
    let realFilterValueMin = filterValMin;
    let realFilterValueMax = filterValMax; // To finalize in case of override…

    // To coercion the date field into the valid date
    const rowObjectsCoercionScheme = dataSourceDescription.raw_rowObjects_coercionScheme;
    const operation = _.get(rowObjectsCoercionScheme[realColumnName], 'operation');
    const isDate = operation === 'ToDate';
    const isPercent = operation === 'ToPercent';

    if (isDate) {
        const [dateMinFormat] = datatypes.getDateUnit(filterValMin);
        const [dateMaxFormat, dateMaxUnit] = datatypes.getDateUnit(filterValMax);

        const filterDateMin = moment.utc(filterValMin, dateMinFormat);
        const filterDateMax = moment.utc(filterValMax, dateMaxFormat);

        if (!filterDateMin.isValid() || !filterDateMax.isValid()) {
            throw new Error('Invalid date');
        }

        realFilterValueMin = filterDateMin.toDate();
        realFilterValueMax = filterDateMax
            .add(1, dateMaxUnit)
            .subtract(1, 'second')
            .toDate();
    } else if (isNumber(dataSourceDescription, realColumnName)) {
        realFilterValueMin = Number.parseFloat(realFilterValueMin);
        realFilterValueMax = Number.parseFloat(realFilterValueMax);

        if (isPercent) {
            realFilterValueMin = realFilterValueMin / 100;
            realFilterValueMax = realFilterValueMax / 100;
        }
    }
    const overrides = dataSourceDescription.fe_filters.oneToOneOverrideWithValuesByTitleByFieldName || {};
    const fieldNameOverrides = overrides[realColumnName];

    if (fieldNameOverrides) {
        const valueByOverrideMin = fieldNameOverrides.find(
            valueByOverride => valueByOverride.override === realFilterValueMin,
        );

        if (typeof valueByOverrideMin === 'undefined') {
            // we'll just use the value they entered - maybe a user is manually editing the URL
            winston.error(
                `Missing override value for overriden column ${realColumnName} and incoming filterValMin ${filterValMin}`,
            );
            throw new Error('Undefined match condition');
        }

        realFilterValueMin = valueByOverrideMin.value;

        const valueByOverrideMax = fieldNameOverrides.find(
            valueByOverride => valueByOverride.override === realFilterValueMax,
        );

        if (typeof valueByOverrideMax === 'undefined') {
            // we'll just use the value they entered - maybe a user is manually editing the URL
            winston.error(
                `Missing override value for overridden column ${realColumnName} and incoming filterValMax ${filterValMax}`,
            );
            throw new Error('Undefined match condition');
        }

        realFilterValueMax = valueByOverrideMax.value;
    }

    // We need to consider that the search column is array
    const projectOp = {
        $project: {
            _id: 1,
            pKey: 1,
            srcDocPKey: 1,
            rowParams: 1,
            matchingField: {
                $cond: {
                    if: { $isArray: '$' + realColumnNamePath },
                    then: { $size: '$' + realColumnNamePath }, // gets the number of items in the array
                    else: '$' + realColumnNamePath,
                },
            },
        },
    };

    const matchOp = {
        $match: {
            matchingField: {
                $gte: realFilterValueMin,
                $lte: realFilterValueMax,
            },
        },
    };

    return { matchConditions: [projectOp, matchOp] };
};
module.exports.activeFilterRange_matchCondition_orErrDescription = _activeFilterRange_matchCondition_orErrDescription;

module.exports.publishMatch = aggregationOperators => [
    {
        $match: {
            published: { $ne: false },
        },
    },
    ...aggregationOperators,
];

var _formatSearchDate = function (searchQ, format, outputFormat) {
    // try and use outputFormat for parsing first
    let searchDate = moment.utc(searchQ, outputFormat, true);
    // then try format
    if (!searchDate.isValid()) {
        // special parsing for quarterly dates
        if (format === 'QQYYYY') {
            searchDate = moment.utc(datatypes.translateSample(searchQ), 'MM/DD/YYYY', true);
        } else {
            searchDate = moment.utc(searchQ, format, true);
        }
    }
    // then try without format
    if (!searchDate.isValid()) {
        searchDate = moment.utc(searchQ);
    }
    return searchDate;
};

//returns formatted date or original value
const _convertDateToBeRecognizable = function (originalVal, key, dataSourceDescription) {
    if (
        dataSourceDescription.raw_rowObjects_coercionScheme[key] &&
        dataSourceDescription.raw_rowObjects_coercionScheme[key].operation === 'ToDate'
    ) {
        const raw_rowObjects_coercionScheme = dataSourceDescription.raw_rowObjects_coercionScheme;
        const coersionSchemeOfKey = raw_rowObjects_coercionScheme[key];
        if (originalVal === null || originalVal === '') {
            return originalVal; // do not attempt to format
        }
        const newDateValue = moment(originalVal, moment.ISO_8601)
            .utc()
            .format(coersionSchemeOfKey.outputFormat.replace('QQYYYY', '\\QQ YYYY'));
        return newDateValue;
    }
    return originalVal;
};
module.exports.convertDateToBeRecognizable = _convertDateToBeRecognizable;

// returns full moment date object or original value
// e.g. '2014' becomes a full moment date object representing 2014-01-01T00:00:00.000Z (UTC)
const _convertDateFromRecognizable = function (originalVal, key, dataSourceDescription) {
    if (
        dataSourceDescription.raw_rowObjects_coercionScheme[key] &&
        dataSourceDescription.raw_rowObjects_coercionScheme[key].operation === 'ToDate'
    ) {
        const raw_rowObjects_coercionScheme = dataSourceDescription.raw_rowObjects_coercionScheme;
        const coersionSchemeOfKey = raw_rowObjects_coercionScheme[key];
        if (originalVal === null || originalVal === '') {
            return originalVal; // do not attempt to format
        }
        const newDateValue = moment.utc(originalVal, coersionSchemeOfKey.outputFormat).format();
        return newDateValue;
    }
    return originalVal;
};
module.exports.convertDateFromRecognizable = _convertDateFromRecognizable;

//returns the date output format (e.g. 'YYYY', 'MM/YYYY') which can be used in moment to format as a user-specified
// recognizable date
const _getDateOutputFormat = function (key, dataSourceDescription) {
    if (
        dataSourceDescription.raw_rowObjects_coercionScheme[key] &&
        dataSourceDescription.raw_rowObjects_coercionScheme[key].operation === 'ToDate'
    ) {
        const raw_rowObjects_coercionScheme = dataSourceDescription.raw_rowObjects_coercionScheme;
        const coersionSchemeOfKey = raw_rowObjects_coercionScheme[key];
        return coersionSchemeOfKey.outputFormat;
    }
    return '';
};
module.exports.getDateOutputFormat = _getDateOutputFormat;

//
function _new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill(dataSourceDescription) {
    const truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = {};
    const fe_filters_fabricatedFilters = dataSourceDescription.fe_filters.fabricated;
    if (typeof fe_filters_fabricatedFilters !== 'undefined') {
        const fe_filters_fabricatedFilters_length = fe_filters_fabricatedFilters.length;
        for (let i = 0; i < fe_filters_fabricatedFilters_length; i++) {
            const fabricatedFilter = fe_filters_fabricatedFilters[i];
            const filterCol = fabricatedFilter.title;
            truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill[filterCol] = {};
            const choices = fabricatedFilter.choices;
            const choices_length = choices.length;
            if (choices_length === 1) {
                // then we do not want to display the filter col key for this one
                for (let j = 0; j < choices_length; j++) {
                    const choice = choices[j];
                    const filterVal = choice.title;
                    truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill[filterCol][
                        filterVal
                        ] = true;
                }
            }
        }
    }

    return truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill;
}

module.exports.new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill = _new_truesByFilterValueByFilterColumnName_forWhichNotToOutputColumnNameInPill;

module.exports.filterObjFromQueryParams = queryParams => {
    const query = _.transform(queryParams, (result, rawValue, key) => {
        let value;
        try {
            value = JSON.parse(rawValue);
        } catch (e) {
            value = rawValue;
        }

        let escapedValue;
        if (_.isArray(value)) {
            escapedValue = _.map(value, item => validator.escape(_.toString(item)));
        } else if (_.isObject(value)) {
            // Usually for range slider (min & max)
            escapedValue = {};
            _.forEach(value, (item, key) => {
                escapedValue[_.toString(key)] = validator.escape(_.toString(item));
            });
        } else {
            escapedValue = [validator.escape(_.toString(value))];
        }

        result[validator.escape(_.toString(key))] = escapedValue;

        return result;
    });

    return _.omit(query, [
        'datasetId',
        'source_key',
        'sortBy',
        'page',
        'groupBy',
        'chartBy',
        'segmentBy',
        'stackBy',
        'mapBy',
        'aggregateBy',
        'searchQ',
        'searchCol',
        'embed',
        'groupSize',
        'preview',
        'xAxis',
        'yAxis',
        'groupByDuration',
        'groupByRange',
        'limit',
        'nested',
        'horizontal',
        'normalize',
        'sortDirection',
        'accessibility',
        'revision',
        'secondaryCol',
        'timeValue',
        'radius',
        'colFilter',
        'puppeteerDebug',
        'defaultFilters',
        'viewType',
        'subdomain',
        'instanceId',
        'objectIndex',
        'objectId',
        'sourceKey',
        'queryFilters',
        'puppeteerScreenshotDebug',
    ]);
};

function _valueToExcludeByOriginalKey(originalVal, dataSourceDescription, groupBy_realColumnName, viewType) {
    const fe_valuesToExcludeByOriginalKey = convertArrayObjectToObject(
        dataSourceDescription.fe_views.views[viewType].valuesToExcludeByOriginalKey,
    );

    if (fe_valuesToExcludeByOriginalKey !== null) {
        if (fe_valuesToExcludeByOriginalKey._all) {
            if (originalVal === '' && fe_valuesToExcludeByOriginalKey._all.includes('""')) {
                return null;
            }
            if (fe_valuesToExcludeByOriginalKey._all.includes(originalVal)) {
                return null;
            }
        }

        if (_.includes(fe_valuesToExcludeByOriginalKey[groupBy_realColumnName], originalVal)) {
            return null;
        }
    }

    let displayableVal = originalVal;
    if (dataSourceDescription.includeEmptyFields) {
        if (originalVal === null && dataSourceDescription.includeEmptyFields) {
            // null breaks chart but we don't want to lose its data
            displayableVal = '(null)';
        } else if (originalVal === '' && dataSourceDescription.includeEmptyFields) {
            // we want to show a category for it rather than it appearing broken by lacking a category
            displayableVal = '(not specified)';
        }
    }

    return displayableVal;
}

module.exports.ValueToExcludeByOriginalKey = _valueToExcludeByOriginalKey;

const determineBrightness = _.memoize(function (backgroundColor) {
    // brightness method described here - http://alienryderflex.com/hsp.html
    let r, g, b;
    const rWeight = 0.299,
        gWeight = 0.587,
        bWeight = 0.114;

    // Calculate individual color components
    try {
        r = parseInt('0x' + backgroundColor.slice(1, 3)) / 255;
        g = parseInt('0x' + backgroundColor.slice(3, 5)) / 255;
        b = parseInt('0x' + backgroundColor.slice(5, 7)) / 255;
    } catch (err) {
        winston.error(err);
        return 1;
    }

    return Math.sqrt(rWeight * (r * r) + gWeight * (g * g) + bWeight * (b * b));
});

function _useLightBrandText(backgroundColor) {
    return _.isString(backgroundColor) && determineBrightness(backgroundColor) <= 0.54;
}

module.exports.useLightBrandText = _useLightBrandText;

function _calcContentColor(backgroundColor) {
    return _useLightBrandText(backgroundColor) ? '#FFFFFF' : '#000000';
}

module.exports.calcContentColor = _calcContentColor;

function _formatCoercedFieldsFromRowObject(rowObject, dataSourceDescription, mergedFields, customFieldName) {
    const rowParams = rowObject.rowParams;
    const rowParams_keys = mergedFields || Object.keys(rowParams);

    for (let i = 0; i < rowParams_keys.length; i++) {
        const key = rowParams_keys[i];

        if (Array.isArray(rowParams[key])) {
            for (let j = 0; j < dataSourceDescription.customFieldsToProcess.length; j++) {
                const { fieldsToMergeIntoArray } = dataSourceDescription.customFieldsToProcess[j];
                customFieldName = dataSourceDescription.customFieldsToProcess[j].fieldName;
                return _formatCoercedFieldsFromRowObject(
                    rowObject,
                    dataSourceDescription,
                    fieldsToMergeIntoArray,
                    customFieldName,
                    dataSourceDescription,
                );
            }
        }

        if (dataSourceDescription.raw_rowObjects_coercionScheme.hasOwnProperty(key)) {
            rowParams[key] = formatFieldValue(rowParams[key], {
                ...dataSourceDescription.raw_rowObjects_coercionScheme[key],
                usePercent: rowObject.usePercent,
            });
        }
    }
    return rowParams;
}

module.exports.formatCoercedFieldsFromRowObject = _formatCoercedFieldsFromRowObject;

function _formatCoercedField(key, value, dataSourceDescription, usePercent) {
    for (let i = 0; i < dataSourceDescription.customFieldsToProcess.length; i++) {
        const mergedFields = dataSourceDescription.customFieldsToProcess[i].fieldsToMergeIntoArray;
        const fieldName = dataSourceDescription.customFieldsToProcess[i].fieldName;
        if (fieldName === key) {
            // check each of the merged fields
            // todo: it checks only the first one
            for (let j = 0; j < mergedFields.length; j++) {
                return _formatCoercedField(mergedFields[j], value, dataSourceDescription, usePercent);
            }
        }
    }

    if (dataSourceDescription.raw_rowObjects_coercionScheme.hasOwnProperty(key)) {
        return formatFieldValue(value, {
            ...dataSourceDescription.raw_rowObjects_coercionScheme[key],
            usePercent,
        });
    }

    return value;
}

module.exports.formatCoercedField = _formatCoercedField;

function _addNonFilterQueryToUrl(query, routePath_base) {
    let joinCharacter = routePath_base.includes('?') ? '&' : '?';

    // preview and embed don't coexist
    if (isEmbed(query)) {
        routePath_base = `${routePath_base}${joinCharacter}embed=true`;
        joinCharacter = '&';
    } else if (query.preview === 'true') {
        routePath_base = `${routePath_base}${joinCharacter}preview=true`;
        joinCharacter = '&';
    }

    if (query.queryFilters === 'true') {
        routePath_base = `${routePath_base}${joinCharacter}queryFilters=true`;
        joinCharacter = '&';
    }

    if (query.revision > 1) {
        routePath_base = `${routePath_base}${joinCharacter}revision=${query.revision}`;
    }

    return routePath_base;
}

module.exports.addNonFilterQueryToUrl = _addNonFilterQueryToUrl;

function _groupDetailData(data, dataSourceDescription = {}, usePercent) {
    const { fe_displayTitleOverrides } = dataSourceDescription;

    const detailFlag = '__detail__';
    let structuredData = data;

    _.each(data, function (datum) {
        const detailData = {};
        for (let field in datum) {
            if (field.startsWith(detailFlag)) {
                const originalField = field.replace(detailFlag, '');
                const humanReadable = fe_displayTitleOverrides[originalField] || originalField;

                detailData[humanReadable] = _formatCoercedField(
                    originalField,
                    datum[field],
                    dataSourceDescription,
                    usePercent,
                );

                delete datum[field];
            }
        }

        datum.detailData = detailData;
    });

    return structuredData;
}

module.exports.groupDetailData = _groupDetailData;

/**
 * Field override helper. Returns the overridden field if there is one, else returns the given field
 * @param {String} field
 * @param {Object} fe_displayTitleOverrides
 */
function fieldOverrideIfExists(field, { fe_displayTitleOverrides }) {
    return fe_displayTitleOverrides[field] || field;
}

module.exports.fieldOverrideIfExists = fieldOverrideIfExists;

/**
 * Merge view display names from views config into dataset
 * Used for displaying view name in explore tile in Showcase and Team page
 * @param {Object} datasourceViews The view object in the datasource description
 * @param {Object} allViews The Views config object
 */
function mergeViewDisplayNamesIntoDatasourceDescription(datasourceViews = {}, allViews = {}) {
    _.each(datasourceViews, (datasetView, key) => {
        if (key in allViews) {
            datasetView.displayAs = allViews[key];
        }

        // Filter which data is returned from views
        datasourceViews[key] = _.pick(datasetView, ['visible', 'displayAs']);
    });

    return datasourceViews;
}

module.exports.mergeViewDisplayNamesIntoDatasourceDescription = mergeViewDisplayNamesIntoDatasourceDescription;

const _isViewUsePercentUnit = (dataSourceDescription, viewType) =>
    _.get(dataSourceDescription, ['fe_views', 'views', viewType, 'units'], '') === PERCENT_UNIT;

module.exports.isViewUsePercentUnit = _isViewUsePercentUnit;

const _isPercentOperation = (dataSourceDescription, columnName) =>
    _.get(dataSourceDescription, ['raw_rowObjects_coercionScheme', columnName, 'operation']) === 'ToPercent';

module.exports.isPercentOperation = _isPercentOperation;

module.exports.matchExcludedFields = (dataSourceDescription, view) => {
    const excludeFields = convertArrayObjectToObject(
        dataSourceDescription.fe_views.views[view].valuesToExcludeByOriginalKey,
    );

    if (_.isEmpty(excludeFields)) {
        return [];
    }

    return [
        {
            $match: {
                ..._.reduce(
                    excludeFields,
                    (result, value, key) => ({ ...result, [`rowParams.${key}`]: { $nin: value } }),
                    {},
                ),
            },
        },
    ];
};
