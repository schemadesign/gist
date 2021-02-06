const winston = require('winston');
const _ = require('lodash');

const processed_row_objects = require('../../../../models/processed_row_objects');
const { matchExcludedFields } = require('../../func');
const {
    activeSearch_matchOp_orErrDescription,
    activeFilter_matchOp_orErrDescription_fromMultiFilter,
    isPercentOperation,
} = require('../../func');
const { formatData } = require('./pieSet.helpers');
const { groupSizes } = require('../../config');

module.exports.BindData = function(dataSourceDescription, options, callback) {
    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(
        dataSourceDescription._id
    );
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    winston.info('Obtaining Grouped ResultSet');

    const aggregationOperators = matchExcludedFields(dataSourceDescription, 'pieSet');

    const aggregate = [
        { $unwind: `$rowParams.${options.groupBy_realColumnName}` },
        {
            $project: {
                _id: 0,
                [options.groupBy_realColumnName]: `$rowParams.${options.groupBy_realColumnName}`,
                data: {
                    ..._.transform(options.pies, (results, element) => {
                        results[element.realName] = `$rowParams.${element.realName}`;
                    }),
                },
            },
        },
        {
            $project: {
                label: `$${options.groupBy_realColumnName}`,
                data: {
                    $objectToArray: '$data',
                },
            },
        },
        { $unwind: '$data' },
        {
            $group: {
                _id: {
                    label: '$label',
                    title: '$data.k',
                },
                value: {
                    $sum: '$data.v',
                },
            },
        },
        {
            $sort: { value: -1 },
        },
        {
            $group: {
                _id: '$_id.title',
                data: {
                    $push: {
                        label: '$_id.label',
                        value: '$value',
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                title: '$_id',
                data: {
                    $slice: ['$data', groupSizes.pieSet],
                },
            },
        },
    ];

    if (options.isSearchActive) {
        const { matchOps, err } = activeSearch_matchOp_orErrDescription(
            dataSourceDescription,
            options.searchCol,
            options.searchQ
        );
        if (err) {
            return callback(err);
        }

        winston.info('Search is active, adding to query');
        aggregationOperators.push(...matchOps);
    }

    if (options.isFilterActive) {
        const { matchOps, err } = activeFilter_matchOp_orErrDescription_fromMultiFilter(
            dataSourceDescription,
            options.filterObj
        );
        if (err) {
            return callback(err);
        }

        winston.info('Filter is active, adding to query');
        aggregationOperators.push(...matchOps);
    }

    const isPercentValue = columnName => isPercentOperation(dataSourceDescription, columnName);
    const isChartByPercent = isPercentValue(options.groupBy_realColumnName);
    const isAggregateByPercent = isPercentValue(options.aggregateBy_realColumnName);

    const doneFn = (err, results) => {
        if (err) {
            return callback(err);
        }

        const { docs, flatResults, colors } = formatData({
            results,
            options,
            dataSourceDescription,
            simplePieSet: true,
        });

        const data = {
            flatResults,
            docs,
            colors,
            meta: {
                numberOfResults: docs.length,
                onPageNum: options.onPageNum,
                resultsOffset: options.resultsOffset,
                routePath_base: options.routePath_base,
                filterObj: options.filterObj,
                revision: options.revision,
                isChartByPercent,
                isAggregateByPercent,
            },
        };

        callback(null, data);
    };

    if (_.isEmpty(aggregationOperators)) {
        return processedRowObjects_mongooseModel
            .aggregate(aggregate)
            .allowDiskUse(true)
            .exec(doneFn);
    }

    aggregationOperators.push(...aggregate);
    processedRowObjects_mongooseModel
        .aggregate(aggregationOperators)
        .allowDiskUse(true)
        .exec(doneFn);
};
