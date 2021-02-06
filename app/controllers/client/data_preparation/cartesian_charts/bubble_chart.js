const winston = require('winston');
const Batch = require('batch');
const _ = require('lodash');

const processed_row_objects = require('../../../../models/processed_row_objects');
const func = require('../../func');
const colorPalette = require('../../colorPalette');

/**
 * Bubble Chart view action controller.
 */
module.exports.BindData = function (dataSourceDescription, options, callback) {
    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    let graphData;
    let wholeFilteredSetAggregationOperators = [];

    const batch = new Batch();
    batch.concurrency(1);

    // start constructing query
    batch.push(function (done) {

        winston.info('Constructing query');

        var _orErrDesc;

        if (options.isSearchActive) {
            _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, options.searchCol, options.searchQ);
            if (_orErrDesc.err) {
                _orErrDesc.matchOps = [];
            }

            winston.info('Search is active, adding to query');
            wholeFilteredSetAggregationOperators = wholeFilteredSetAggregationOperators.concat(_orErrDesc.matchOps);
        }
        if (options.isFilterActive) { // rules out undefined filterCol
            _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, options.filterObj);
            if (_orErrDesc.err) {
                _orErrDesc.matchOps = [];
            }

            winston.info('Filter is active, adding to query');
            wholeFilteredSetAggregationOperators = wholeFilteredSetAggregationOperators.concat(_orErrDesc.matchOps);
        }

        wholeFilteredSetAggregationOperators = wholeFilteredSetAggregationOperators.concat([
            {
                $group: {
                    _id: '$rowParams.' + options.groupBy_realColumnName,
                    data: {
                        $push: {
                            objectId: '$_id',
                            title: '$rowParams.' + dataSourceDescription.objectTitle,
                            x: '$rowParams.' + options.xAxis_realName,
                            y: '$rowParams.' + options.yAxis_realName,
                            radius: '$rowParams.' + options.radius.realName,
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    timeValue: '$_id',
                    data: '$data',
                },
            },
            {
                $sort: { timeValue: 1 },
            },
        ]);

        wholeFilteredSetAggregationOperators = func.publishMatch(wholeFilteredSetAggregationOperators);

        var doneFn = function (err, results) {
            winston.info('...done');
            if (err) {
                return done(err);
            }

            // get unique set of labels and assign colors
            var labels = _.flatMap(results, function (result) {
                return result.data.map(function (d) {
                    return d.title;
                });
            });
            labels = _.uniq(labels).sort();

            var colors = colorPalette.processColors(labels, dataSourceDescription._team.colorPalette, dataSourceDescription.colorMapping);
            colors = colors.slice(0, labels.length);

            graphData = {
                labels: labels,
                colors: colors,
                data: results,
            };

            done();
        };

        winston.info('Ready for aggregate query...');
        processedRowObjects_mongooseModel.aggregate(wholeFilteredSetAggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
    });

    batch.end(function (err) {
        if (err) {
            return callback(err);
        }

        const isPercentValue = (columnName) => func.isPercentOperation(dataSourceDescription, columnName);
        const meta = {
            isTitleByPercent: isPercentValue(dataSourceDescription.objectTitle),
            isXAxisPercent: isPercentValue(options.xAxis_realName),
            isYAxisPercent: isPercentValue(options.yAxis_realName),
            isRadiusPercent: isPercentValue(options.radius.realName),
            numberOfResults: graphData.labels.length,
            numberOfFrames: graphData.data.length,
        };
        const data = {
            // graphData contains all the data rows; used by the template to create the visualization
            graphData,
            title: dataSourceDescription.title,
            description: dataSourceDescription.description,
            meta,
        };

        winston.info('Returning data');

        callback(err, data);
    });
};
