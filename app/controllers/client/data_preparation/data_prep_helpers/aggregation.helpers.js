const { isNil, isEmpty } = require('lodash');
const winston = require('winston');
const { getGroupBySegment } = require('./segmentBy.helpers');

const { AGGREGATE_BY_DEFAULT_COLUMN_NAME } = require('../../config');
const { publishMatch } = require('../../func');
const { addFiltersToQuery, addSearchToQuery } = require('./filters_aggregation_helpers');

module.exports = {
    getAggregationQuery,
    addDefaultAggregationOperators,
    aggregateProcessedRowObjects,
    getFieldTypeAggregationOperators,
};

function getAggregationQuery({ options, isSegmentBy, segmentBy }) {
    const {
        aggregateBy_realColumnName: aggregateBy,
        stackBy_realColumnName: stackBy,
        groupBy_realColumnName: groupBy,
    } = options;
    const groupByParam = `$rowParams.${groupBy}`;
    const stackByParam = `$rowParams.${stackBy}`;
    const aggregateByParam = `$rowParams.${aggregateBy}`;
    const isDefaultAggregate = aggregateBy === AGGREGATE_BY_DEFAULT_COLUMN_NAME;

    if (isSegmentBy) {
        const groupBySegment = getGroupBySegment(groupBy)[segmentBy];

        return [
            { $unwind: groupByParam },
            { $unwind: stackByParam },
            {
                $group: {
                    _id: {
                        ...groupBySegment,
                        stackBy: stackByParam,
                    },
                    value: { $sum: isDefaultAggregate ? 1 : aggregateByParam },
                    originalId: { $first: '$_id' },
                    firstDate: { $first: groupByParam },
                },
            },
            {
                $project: {
                    _id: 0,
                    label: '$firstDate',
                    stack: '$_id.stackBy',
                    value: `$value`,
                    date: {
                        day: `$_id.day`,
                        month: `$_id.month`,
                        year: `$_id.year`,
                    },
                },
            },
        ];
    }

    if (!isNil(aggregateBy) && !isEmpty(aggregateBy) && !isDefaultAggregate) {
        winston.debug('AggregateBy is active...');

        if (!isNil(stackBy) && !isEmpty(stackBy)) {
            winston.debug(' ... and StackBy is active');

            return [
                { $unwind: groupByParam },
                { $unwind: stackByParam },
                {
                    $group: {
                        _id: {
                            groupBy: groupByParam,
                            stackBy: stackByParam,
                        },
                        value: { $sum: aggregateByParam },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        label: '$_id.groupBy',
                        stack: '$_id.stackBy',
                        value: 1,
                    },
                },
            ];
        } else {
            winston.debug('... and StackBy is not active');

            // Count by summing numeric field in group if option in datasource description is set
            return [
                { $unwind: groupByParam },
                {
                    $group: {
                        _id: groupByParam,
                        value: { $sum: aggregateByParam },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        label: '$_id',
                        value: 1,
                    },
                },
            ];
        }
    } else {
        winston.debug('AggregateBy is not active...');

        // Count by number of records
        if (!isNil(stackBy) && !isEmpty(stackBy)) {
            winston.debug('...and StackBy is active');

            return [
                { $unwind: groupByParam },
                { $unwind: stackByParam },
                {
                    $group: {
                        _id: {
                            groupBy: groupByParam,
                            stackBy: stackByParam,
                        },
                        value: { $addToSet: '$_id' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        label: '$_id.groupBy',
                        stack: '$_id.stackBy',
                        value: { $size: '$value' },
                    },
                },
            ];
        } else {
            winston.debug('...and StackBy is not active');

            return [
                { $unwind: groupByParam }, // requires MongoDB 3.2, otherwise throws an error if non-array
                {
                    // unique/grouping and summing stage
                    $group: {
                        _id: groupByParam,
                        value: { $addToSet: '$_id' },
                    },
                },
                {
                    // reformat
                    $project: {
                        _id: 0,
                        label: '$_id',
                        value: { $size: '$value' },
                    },
                },
            ];
        }
    }
}

/**
 * @param {Object} dataSource
 * @param {Object} options
 * @returns {Object[]}
 */
function addDefaultAggregationOperators(dataSource, options) {
    const defaultAggregationOperators = [
        ...addFiltersToQuery(dataSource, options),
        ...addSearchToQuery(dataSource, options),
    ];

    return publishMatch(defaultAggregationOperators);
}

/**
 * @param {Object} model
 * @param {Object} aggregationOperators
 * @returns {Promise<Array>}
 */
async function aggregateProcessedRowObjects(model, aggregationOperators) {
    const result = await model
        .aggregate(aggregationOperators)
        .allowDiskUse(true)
        .exec();

    return isEmpty(result) ? [] : result;
}

/**
 * @param {String} fieldName
 * @param {Boolean} isDate
 * @param {Boolean} isNumber
 * @returns {Object}
 */
function getFieldTypeAggregationOperators(fieldName, { isDate, isNumber }) {
    const fieldCheckConditions = [{ [fieldName]: { $exists: true } }, { [fieldName]: { $ne: null } }];

    if (isDate) {
        fieldCheckConditions.push({ [fieldName]: { $type: 'date' } });
    } else if (isNumber) {
        const numericTypes = ['double', 'int', 'long', 'decimal'];
        fieldCheckConditions.push({ $or: numericTypes.map(type => ({ [fieldName]: { $type: type } })) });
    }

    return { $match: { $and: fieldCheckConditions } };
}
