const _ = require('lodash');

const { formatCoercedField } = require('../../func');
const colorPalette = require('../../colorPalette');
const { getSegmentId } = require('../data_prep_helpers/segmentBy.helpers');
const { getGroupBySegment } = require('../data_prep_helpers/segmentBy.helpers');
const { isPercentOperation } = require('../../func');
const { AGGREGATE_BY_DEFAULT_COLUMN_NAME } = require('../../config');

module.exports = { formatData, getAggregateGroups };

function formatData({ results, options, dataSourceDescription, simplePieSet = false, isSegmentBy }) {
    if (_.isNil(results)) {
        return { docs: [], flatResults: [], colors: [] };
    }

    const columnName = simplePieSet ? options.groupBy_realColumnName : options.chartBy_realColumnName;

    const formatField = (option, value) => formatCoercedField(option, value, dataSourceDescription);
    const getUniqValues = values =>
        _.chain(values)
            .map(({ data }) => data)
            .flatten()
            .map(({ label, date, ...rest }) => ({
                label: isSegmentBy ? getSegmentId(date) : formatField(columnName, label),
                ...rest,
            }))
            .uniqBy('label')
            .sortBy('label')
            .value();

    const uniqueValues = getUniqValues(results);
    const labels = uniqueValues.map(({ label }) => label);
    const colors = colorPalette.processColors(
        labels,
        dataSourceDescription._team.colorPalette,
        dataSourceDescription.colorMapping
    );
    const flatResults = uniqueValues.map((data, i) => ({
        ...data,
        color: colors[i],
    }));

    const getHumanReadableTitle = title =>
        _.get(
            _.find(options.pies, data => data.realName === title),
            ['humanReadable'],
            title
        );

    const getFormattedValues = ({ title, data }) => {
        return {
            title: simplePieSet ? getHumanReadableTitle(title) : formatField(options.groupBy_realColumnName, title),
            sum: _.sumBy(data, 'value'),
            isPercentage: isPercentOperation(dataSourceDescription, title),
            data: data.map(({ label, value, date }) => {
                const formattedLabel = isSegmentBy ? getSegmentId(date) : formatField(columnName, label);
                return {
                    label: formattedLabel,
                    value,
                    color: flatResults.find(data => data.label === formattedLabel).color,
                };
            }),
        };
    };

    const makePiesUnique = results => {
        let index = 0;
        const titlesIndexes = {};

        const updatedResults = results.reduce((list, { title, data, sum, isPercentage }) => {
            if (_.has(titlesIndexes, title)) {
                const titleIndex = titlesIndexes[title];
                const searchingList = _.get(list, [titleIndex, 'data']);

                data.forEach(item => {
                    const { label, value } = item;
                    const itemIndex = _.findIndex(searchingList, searchItem => searchItem.label === label);

                    if (itemIndex < 0) {
                        list[titleIndex].data.push(item);
                    } else {
                        list[titleIndex].data[itemIndex].value += value;
                    }
                });
            } else {
                titlesIndexes[title] = index;
                index++;
                list.push({ title, data, sum, isPercentage });
            }

            return list;
        }, []);

        updatedResults.forEach(item => {
            item.data = _.chain(item.data)
                .sortBy('value')
                .reverse();
        });

        return updatedResults;
    };

    const transformedResults = results.map(getFormattedValues);
    const docs = makePiesUnique(transformedResults);

    return { docs, flatResults, colors };
}

const getTotalAggregationQuery = aggregateBy_realColumnName => {
    if (!_.isEmpty(aggregateBy_realColumnName) && aggregateBy_realColumnName !== AGGREGATE_BY_DEFAULT_COLUMN_NAME) {
        return { $sum: `$rowParams.${aggregateBy_realColumnName}` };
    }

    return { $sum: 1 };
};

function getAggregateGroups({ isSegmentBy, options, segmentBy }) {
    const { aggregateBy_realColumnName, chartBy_realColumnName, groupBy_realColumnName } = options;
    if (isSegmentBy) {
        const groupBySegment = getGroupBySegment(chartBy_realColumnName)[segmentBy];
        return [
            {
                $group: {
                    _id: {
                        ...groupBySegment,
                        title: `$rowParams.${groupBy_realColumnName}`,
                    },
                    firstDate: { $first: `$rowParams.${chartBy_realColumnName}` },
                    total: getTotalAggregationQuery(aggregateBy_realColumnName),
                },
            },
            {
                $sort: { total: -1 },
            },
            {
                $group: {
                    _id: '$_id.title',
                    data: {
                        $push: {
                            label: '$firstDate',
                            value: '$total',
                            date: {
                                day: `$_id.day`,
                                month: `$_id.month`,
                                year: `$_id.year`,
                            },
                        },
                    },
                },
            },
        ];
    }

    return [
        {
            $group: {
                _id: {
                    label: `$rowParams.${chartBy_realColumnName}`,
                    title: `$rowParams.${groupBy_realColumnName}`,
                },
                total: getTotalAggregationQuery(aggregateBy_realColumnName),
            },
        },
        {
            $sort: { total: -1 },
        },
        {
            $group: {
                _id: '$_id.title',
                data: {
                    $push: {
                        label: '$_id.label',
                        value: '$total',
                    },
                },
            },
        },
    ];
}
