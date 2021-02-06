const winston = require('winston');
const Batch = require('batch');
const _ = require('lodash');

const processed_row_objects = require('../../../../models/processed_row_objects');
const func = require('../../func');
const colorPalette = require('../../colorPalette');
const { getSegmentId } = require('../data_prep_helpers/segmentBy.helpers');
const { getAggregationQuery } = require('./pieChart.helpers');

module.exports.BindData = function (dataSourceDescription, options, callback) {
    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(
        dataSourceDescription._id,
    );
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;
    const groupedResults = [];
    const batch = new Batch();
    const { segmentBy, chartByIsDate } = options.segmentBy;
    const isSegmentBy = segmentBy && segmentBy !== 'None' && chartByIsDate;

    batch.concurrency(1);

    // Obtain Grouped ResultSet
    batch.push(function (done) {
        winston.info('Obtaining Grouped ResultSet');

        const aggregationOperators = [];

        if (options.isSearchActive) {
            const searchQuery = func.activeSearch_matchOp_orErrDescription(
                dataSourceDescription,
                options.searchCol,
                options.searchQ,
            );
            if (searchQuery.err) {
                return done(searchQuery.err);
            }

            winston.info('Search is active, adding to query');
            aggregationOperators.push(...searchQuery.matchOps);
        }

        if (options.isFilterActive) {
            const filterQuery = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(
                dataSourceDescription,
                options.filterObj,
            );
            if (filterQuery.err) {
                return done(filterQuery.err);
            }

            winston.info('Filter is active, adding to query');
            aggregationOperators.push(...filterQuery.matchOps);
        }

        const aggregationQuery = getAggregationQuery({ options, isSegmentBy, segmentBy });

        const doneFn = function (err, _groupedResults) {
            if (err) {
                return done(err);
            }

            if (_groupedResults === 'undefined' || _groupedResults === null) {
                _groupedResults = [];
            }

            const finalizedButNotCoalesced_groupedResults = [];

            _groupedResults.forEach(function (el) {
                let displayableVal = func.ValueToExcludeByOriginalKey(
                    el.label,
                    dataSourceDescription,
                    options.groupBy_realColumnName,
                    'pieChart',
                );

                displayableVal = isSegmentBy ? getSegmentId(el.date) : func.formatCoercedField(options.groupBy_realColumnName, displayableVal, dataSourceDescription);

                if (!displayableVal) {
                    return;
                }

                finalizedButNotCoalesced_groupedResults.push({
                    value: el.value,
                    label: displayableVal,
                });
            });

            const summedValuesByLowerCasedLabels = {};
            const titleWithMostMatchesAndMatchCountByLowerCasedTitle = {};

            finalizedButNotCoalesced_groupedResults.forEach(function (el) {
                const label = el.label;
                const value = el.value;
                const label_toLowerCased = label.toString().toLowerCase();
                //
                const existing_valueSum = summedValuesByLowerCasedLabels[label_toLowerCased] || 0;
                summedValuesByLowerCasedLabels[label_toLowerCased] = existing_valueSum + value;
                //
                const existing_titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchCountByLowerCasedTitle[label_toLowerCased] || {
                    label: '',
                    value: -900000000000000,
                };

                if (existing_titleWithMostMatchesAndMatchCount.value < value) {
                    titleWithMostMatchesAndMatchCountByLowerCasedTitle[label_toLowerCased] = {
                        label: label,
                        value: value,
                    };
                }
            });

            const lowerCasedLabels = Object.keys(summedValuesByLowerCasedLabels);

            lowerCasedLabels.forEach(function (key) {
                const summedValue = summedValuesByLowerCasedLabels[key];
                let reconstitutedDisplayableTitle = key;
                const titleWithMostMatchesAndMatchCount = titleWithMostMatchesAndMatchCountByLowerCasedTitle[key];
                if (typeof titleWithMostMatchesAndMatchCount === 'undefined') {
                    winston.error('This should never be undefined.');
                    return callback(new Error('Unexpectedly undefined title with most matches'), null);
                } else {
                    reconstitutedDisplayableTitle = titleWithMostMatchesAndMatchCount.label;
                }

                const roundedSum = Math.round(summedValue * 1000) / 1000;

                const result = {
                    value: roundedSum,
                    label: reconstitutedDisplayableTitle,
                };

                groupedResults.push(result);
            });

            done();
        };

        processedRowObjects_mongooseModel
            .aggregate([...aggregationOperators, ...aggregationQuery])
            .allowDiskUse(true) /* or we will hit mem limit on some pages*/
            .exec(doneFn);
    });

    batch.end(function (err) {
        if (err) {
            return callback(err);
        }

        const labels = groupedResults.map(({ label }) => label);

        const colors = colorPalette.processColors(
            labels,
            dataSourceDescription._team.colorPalette,
            dataSourceDescription.colorMapping,
        );

        const isPercentValue = columnName => func.isPercentOperation(dataSourceDescription, columnName);
        const meta = {
            isChartByPercent: isPercentValue(options.groupBy_realColumnName),
            isAggregateByPercent: isPercentValue(options.aggregateBy_realColumnName),
            sum: _.sumBy(groupedResults, 'value'),
        };

        const data = {
            // graphData contains all the data rows; used by the template to create the chart
            graphData: {
                data: groupedResults,
                colors: colors,
            },
            docs: groupedResults.length ? [1] : [], // For determining if there is any data in view
            meta,
        };

        winston.info('Returning data');

        callback(err, data);
    });
};
