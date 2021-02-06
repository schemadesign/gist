const { AGGREGATE_BY_DEFAULT_COLUMN_NAME } = require('../../config');
const { getGroupBySegment } = require('../data_prep_helpers/segmentBy.helpers');

const getAggregationQuery = ({ options, isSegmentBy, segmentBy }) => {
    const isDefaultColumnName = options.aggregateBy_realColumnName === AGGREGATE_BY_DEFAULT_COLUMN_NAME;

    if (isSegmentBy) {
        const groupBySegment = getGroupBySegment(options.groupBy_realColumnName)[segmentBy];

        return [
            { $unwind: `$rowParams.${options.groupBy_realColumnName}` },
            {
                $group: {
                    _id: groupBySegment,
                    value: { $sum: isDefaultColumnName ? 1 : `$rowParams.${options.aggregateBy_realColumnName}` },
                    firstDate: { $first: `$rowParams.${options.groupBy_realColumnName}` },
                },
            },
            {
                $project: {
                    _id: 0,
                    label: '$firstDate',
                    value: '$value',
                    date: {
                        day: '$_id.day',
                        month: '$_id.month',
                        year: '$_id.year',
                    },
                },
            },
            { $sort: { value: -1 } },
            { $limit: 100 },
        ];
    }

    const groupValue = isDefaultColumnName ? { $addToSet: '$_id' } : {
        $addToSet: {
            object: '$_id',
            totalSum: `$rowParams.${options.aggregateBy_realColumnName}`,
        },
    };
    const projectValue = isDefaultColumnName ? { $size: '$value' } : { $sum: '$value.totalSum' };

    return [
        { $unwind: `$rowParams.${options.groupBy_realColumnName}` },
        {
            $group: {
                _id: {
                    groupBy: `$rowParams.${options.groupBy_realColumnName}`,
                },
                value: groupValue,
            },
        },
        {
            $project: {
                _id: 0,
                label: '$_id.groupBy',
                value: projectValue,
            },
        },
        { $sort: { value: -1 } },
        { $limit: 100 },
    ];
};

module.exports = { getAggregationQuery };
