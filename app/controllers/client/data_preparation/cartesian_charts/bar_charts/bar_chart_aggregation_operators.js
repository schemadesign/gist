const { isNil } = require('lodash');

const { AGGREGATE_BY_DEFAULT_COLUMN_NAME } = require('../../../config');

const queryForAggregateBy = function (aggregateBy_realColumnName, stackBy_realColumnName, groupBy_realColumnName) {
    const aggregationOperators = [];
    const groupOperators = {
        $group: {
            _id: {},
            value: {},
        },
    };

    if (groupBy_realColumnName) {
        aggregationOperators.push({ $unwind: `$rowParams.${groupBy_realColumnName}` });
        groupOperators.$group._id.groupBy = `$rowParams.${groupBy_realColumnName}`;
    }

    if (stackBy_realColumnName) {
        aggregationOperators.push({ $unwind: `$rowParams.${stackBy_realColumnName}` });
        groupOperators.$group._id.stackBy = `$rowParams.${stackBy_realColumnName}`;
    }

    if (aggregateBy_realColumnName) {
        groupOperators.$group.value.$sum = `$rowParams.${aggregateBy_realColumnName}`;
    }

    aggregationOperators.push(groupOperators);
    aggregationOperators.push({
        $project: {
            _id: 0,
            category: '$_id.groupBy',
            label: '$_id.stackBy',
            value: 1,
        },
    });
    aggregationOperators.push({
        $sort: { category: 1 }, //prioritize by category for xaxis sort
    });

    return aggregationOperators;
};

const queryForAggregateByNumberOfRecords = function (stackBy_realColumnName, groupBy_realColumnName) {
    const aggregationOperators = [];
    const groupOperators = {
        $group: {
            _id: {},
            value: { $addToSet: '$_id' },
        },
    };

    if (groupBy_realColumnName) {
        aggregationOperators.push({ $unwind: `$rowParams.${groupBy_realColumnName}` });
        groupOperators.$group._id.groupBy = `$rowParams.${groupBy_realColumnName}`;
    }

    if (stackBy_realColumnName) {
        aggregationOperators.push({ $unwind: `$rowParams.${stackBy_realColumnName}` });
        groupOperators.$group._id.stackBy = `$rowParams.${stackBy_realColumnName}`;
    }

    aggregationOperators.push(groupOperators);
    aggregationOperators.push({
        $project: {
            _id: 0,
            category: '$_id.groupBy',
            label: '$_id.stackBy',
            value: { $size: '$value' },
        },
    });
    aggregationOperators.push({
        $sort: { category: 1 }, //prioritize by category for xaxis sort
    });

    return aggregationOperators;
};

const queryForGroupByDuration = function (stackBy_realColumnName, groupBy_realColumnName, groupByDuration) {
    const aggregationOperators = [];
    const groupOperators = {
        $group: {
            _id: {},
            value: { $addToSet: '$_id' },
        },
    };

    if (groupBy_realColumnName) {
        aggregationOperators.push({ $unwind: `$rowParams.${groupBy_realColumnName}` });
        groupOperators.$group._id.groupBy = {
            $dateToString: {
                format: groupByDuration,
                date: `$rowParams.${groupBy_realColumnName}`,
            },
        };
        groupOperators.$group._id.realGroupBy = `$rowParams.${groupBy_realColumnName}`;
    }

    if (stackBy_realColumnName) {
        aggregationOperators.push({ $unwind: `$rowParams.${stackBy_realColumnName}` });
        groupOperators.$group._id.stackBy = `$rowParams.${stackBy_realColumnName}`;
    }

    aggregationOperators.push(groupOperators);
    aggregationOperators.push({
        $project: {
            _id: 0,
            groupedCategory: '$_id.groupBy',
            category: '$_id.realGroupBy',
            label: '$_id.stackBy',
            value: { $size: '$value' },
        },
    });
    aggregationOperators.push({
        $sort: { category: 1 }, //prioritize by category for xaxis sort
    });

    return aggregationOperators;
};

const queryForGroupByDurationAndAggregate = function (aggregateBy_realColumnName, stackBy_realColumnName, groupBy_realColumnName, groupByDuration) {
    const aggregationOperators = [];
    const groupOperators = {
        $group: {
            _id: {},
            value: {},
        },
    };

    if (groupBy_realColumnName) {
        aggregationOperators.push({ $unwind: `$rowParams.${groupBy_realColumnName}` });
        groupOperators.$group._id.groupBy = {
            $dateToString: {
                format: groupByDuration,
                date: `$rowParams.${groupBy_realColumnName}`,
            },
        };
        groupOperators.$group._id.realGroupBy = `$rowParams.${groupBy_realColumnName}`;
    }

    if (stackBy_realColumnName) {
        aggregationOperators.push({ $unwind: `$rowParams.${stackBy_realColumnName}` });
        groupOperators.$group._id.stackBy = `$rowParams.${stackBy_realColumnName}`;
    }

    if (aggregateBy_realColumnName) {
        groupOperators.$group.value.$sum = `$rowParams.${aggregateBy_realColumnName}`;
    }

    aggregationOperators.push(groupOperators);
    aggregationOperators.push({
        $project: {
            _id: 0,
            groupedCategory: '$_id.groupBy',
            category: '$_id.realGroupBy',
            label: '$_id.stackBy',
            value: 1,
        },
    });
    aggregationOperators.push({
        $sort: { category: 1 }, //prioritize by category for xaxis sort
    });

    return aggregationOperators;
};

const constructAggregationOperators = function (aggregateBy_realColumnName, stackBy_realColumnName, groupBy_realColumnName, groupByDuration) {
    // if aggregating by field/something other than number of items and group by duration is not defined
    if (!isNil(aggregateBy_realColumnName) && aggregateBy_realColumnName !== '' && aggregateBy_realColumnName !== AGGREGATE_BY_DEFAULT_COLUMN_NAME && !groupByDuration) {
        return queryForAggregateBy(aggregateBy_realColumnName, stackBy_realColumnName, groupBy_realColumnName);
    }

    // if aggregating by field/something other than number of items and group by duration is defined
    if (!isNil(aggregateBy_realColumnName) && aggregateBy_realColumnName !== '' && aggregateBy_realColumnName !== AGGREGATE_BY_DEFAULT_COLUMN_NAME && groupByDuration) {
        return queryForGroupByDurationAndAggregate(aggregateBy_realColumnName, stackBy_realColumnName, groupBy_realColumnName, groupByDuration);
    }

    // Count by number of records
    if (groupByDuration) {
        return queryForGroupByDuration(stackBy_realColumnName, groupBy_realColumnName, groupByDuration);
    }

    return queryForAggregateByNumberOfRecords(stackBy_realColumnName, groupBy_realColumnName);
};

module.exports.constructAggregationOperators = constructAggregationOperators;
