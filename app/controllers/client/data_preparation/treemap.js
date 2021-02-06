const winston = require('winston');
const _ = require('lodash');

const { AGGREGATE_BY_DEFAULT_COLUMN_NAME } = require('../config');
const processed_row_objects = require('../../../models/processed_row_objects');
const func = require('../func');
const colorPalette = require('../colorPalette');
const { getGroupBySegment, getSegmentId } = require('./data_prep_helpers/segmentBy.helpers');
const { matchExcludedFields } = require('../func');

module.exports.BindData = async (dataSourceDescription, options, callback) => {
    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(
        dataSourceDescription._id
    );

    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    const { segmentBy, chartByIsDate } = options.segmentBy;
    const isSegmentBy = segmentBy && segmentBy !== 'None' && chartByIsDate;

    let aggregationOperators = matchExcludedFields(dataSourceDescription, 'treemap');
    if (options.isSearchActive) {
        const _orErrDesc = func.activeSearch_matchOp_orErrDescription(
            dataSourceDescription,
            options.searchCol,
            options.searchQ
        );
        if (_orErrDesc.err) {
            return callback(_orErrDesc.err);
        }

        aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
    }

    if (options.isFilterActive) {
        // rules out undefined filterCol
        const _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(
            dataSourceDescription,
            options.filterObj
        );
        if (_orErrDesc.err) {
            return callback(_orErrDesc.err);
        }

        aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
    }

    const getAggregate = () => {
        const isDefaultAggregate = options.aggregateBy_realColumnName === AGGREGATE_BY_DEFAULT_COLUMN_NAME;

        if (isSegmentBy) {
            const groupBySegment = getGroupBySegment(options.chartBy_realColumnName)[segmentBy];

            return [
                { $unwind: `$rowParams.${options.chartBy_realColumnName}` },
                { $unwind: `$rowParams.${options.groupBy_realColumnName}` },
                {
                    $group: {
                        _id: {
                            ...groupBySegment,
                            groupBy: `$rowParams.${options.groupBy_realColumnName}`,
                        },
                        values: { $sum: isDefaultAggregate ? 1 : `$rowParams.${options.aggregateBy_realColumnName}` },
                        originalId: { $first: '$_id' },
                        firstDate: { $first: `$rowParams.${options.chartBy_realColumnName}` },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        originalId: '$originalId',
                        id: `$firstDate`,
                        value: `$values`,
                        parentId: `$_id.groupBy`,
                        date: {
                            day: `$_id.day`,
                            month: `$_id.month`,
                            year: `$_id.year`,
                        },
                    },
                },
            ];
        }

        if (options.aggregateBy_realColumnName === AGGREGATE_BY_DEFAULT_COLUMN_NAME) {
            return [
                { $unwind: '$rowParams.' + options.chartBy_realColumnName },
                { $unwind: '$rowParams.' + options.groupBy_realColumnName },
                {
                    $group: {
                        _id: {
                            id: '$rowParams.' + options.chartBy_realColumnName,
                            parentId: '$rowParams.' + options.groupBy_realColumnName,
                        },
                        originalId: {
                            $first: '$_id',
                        },
                        value: {
                            $sum: 1,
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        originalId: '$originalId',
                        id: '$_id.id',
                        value: '$value',
                        parentId: '$_id.parentId',
                    },
                },
            ];
        }

        return [
            { $unwind: '$rowParams.' + options.chartBy_realColumnName },
            { $unwind: '$rowParams.' + options.groupBy_realColumnName },
            {
                $project: {
                    _id: 0,
                    originalId: '$_id',
                    id: `$rowParams.${options.chartBy_realColumnName}`,
                    value: `$rowParams.${options.aggregateBy_realColumnName}`,
                    parentId: `$rowParams.${options.groupBy_realColumnName}`,
                },
            },
        ];
    };

    const data = await processedRowObjects_mongooseModel
        .aggregate(aggregationOperators.concat([{ $count: 'count' }]))
        .allowDiskUse(true)
        .exec();
    const nonpagedCount = _.get(data, '[0].count', 0);

    const doneFn = (err, results) => {
        if (err) {
            return callback(err);
        }

        const processedResults = results.map(item =>
            Object.assign(item, {
                parentId: func.formatCoercedField(options.groupBy_realColumnName, item.parentId, dataSourceDescription),
                id: isSegmentBy
                    ? getSegmentId(item.date)
                    : func.formatCoercedField(options.chartBy_realColumnName, item.id, dataSourceDescription),
            })
        );

        const uniqParents = _.chain(processedResults)
            .map(item => item.parentId)
            .uniq()
            .value();

        const colors = colorPalette.processColors(
            uniqParents,
            dataSourceDescription._team.colorPalette,
            dataSourceDescription.colorMapping
        );

        const parents = _.map(uniqParents, (parentId, i) => ({
            id: `@${parentId}`,
            label: parentId,
            parentId: '@treemap',
            color: colors[i],
            textColor: func.calcContentColor(colors[i]),
        }));

        const groupedResults = processedResults
            .map(item =>
                Object.assign(item, {
                    parentId: `@${item.parentId}`,
                })
            )
            .reduce((list, item) => {
                const { id: itemId, parentId: itemParentId, value } = item;
                const index = _.findIndex(list, ({ parentId, id }) => parentId === itemParentId && id === itemId);

                if (index < 0) {
                    list.push(item);
                } else {
                    list[index].value += value;
                }

                return list;
            }, [])
            .concat(parents)
            .filter(({ parentId, id }) => parentId !== id && id !== '' && parentId !== '')
            .concat({
                id: '@treemap',
                parentId: '',
            });

        const isPercentValue = columnName => func.isPercentOperation(dataSourceDescription, columnName);
        const isChartByPercent = isPercentValue(options.chartBy_realColumnName);
        const isAggregateByPercent = isPercentValue(options.aggregateBy_realColumnName);
        const isGroupByPercent = isPercentValue(options.groupBy_realColumnName);
        const data = {
            graphData: {
                data: groupedResults,
                parents,
                columns: dataSourceDescription.raw_rowObjects_coercionScheme,
            },
            docs: results.length ? [1] : [], // For determining if there is any data in view
            meta: {
                numberOfResults: results.length,
                pageSize: options.limit < nonpagedCount ? options.limit : nonpagedCount,
                numPages: Math.ceil(nonpagedCount / options.limit),
                nonpagedCount: nonpagedCount,
                onPageNum: options.onPageNum,
                routePath_base: options.routePath_base,
                filterObj: options.filterObj,
                isSegmentBy,
                isChartByPercent,
                isAggregateByPercent,
                isGroupByPercent,
            },
        };
        winston.info('Returning data');

        callback(err, data);
    };

    // Pagination
    const aggregate = aggregationOperators.concat(
        [
            {
                $sort: {
                    [`rowParams.${options.groupBy_realColumnName}`]: 1,
                    [`rowParams.${options.aggregateBy_realColumnName}`]: -1,
                },
            },
        ],
        [{ $skip: options.skipNResults }, { $limit: options.limit }],
        getAggregate()
    );

    return processedRowObjects_mongooseModel
        .aggregate(aggregate)
        .allowDiskUse(true)
        .exec(doneFn);
};
