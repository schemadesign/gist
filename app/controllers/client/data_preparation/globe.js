const winston = require('winston');
const Batch = require('batch');
const _ = require('lodash');

const { VIEW_TYPE_GLOBE } = require('../../../config/views.config');
const processed_row_objects = require('../../../models/processed_row_objects');
const func = require('../func');
const coordAggregationHelpers = require('./data_prep_helpers/coord_aggregation_helpers');

module.exports.BindData = function (dataSourceDescription, sampleDoc, options, callback) {
    const usePercent = true;

    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    let globeViewSettings = dataSourceDescription.fe_views.views.globe;
    const pointColor = globeViewSettings.pointColor || dataSourceDescription.brandColor.accent || '#005CB5';

    let graphData = {};
    let truncatedDataWarnings = [];

    const batch = new Batch();
    batch.concurrency(1);

    var _orErrDesc;
    batch.push(function (done) {
        var aggregationOperators = [];
        if (options.isSearchActive) {
            _orErrDesc = func.activeSearch_matchOp_orErrDescription(dataSourceDescription, options.searchCol, options.searchQ);
            if (_orErrDesc.err) {
                return done(_orErrDesc.err);
            }

            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }
        if (options.isFilterActive) { // rules out undefined filterCol
            _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(dataSourceDescription, options.filterObj);
            if (_orErrDesc.err) {
                return done(_orErrDesc.err);
            }

            aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
        }

        let projectionObject = coordAggregationHelpers.aggregateCoordPoints(dataSourceDescription.objectTitle, options, globeViewSettings.originLatitude, globeViewSettings.originLongitude, globeViewSettings.destinationLatitude, globeViewSettings.destinationLongitude);
        projectionObject = coordAggregationHelpers.projectDetailFields(projectionObject, dataSourceDescription.fe_excludeFieldsObjDetail, dataSourceDescription.fe_fieldDisplayOrder);

        let aggregationQuery = [{ $project: projectionObject }];

        aggregationOperators = aggregationOperators.concat(aggregationQuery);

        var doneFn = function (err, results) {
            const coordinateTitleField = _.get(dataSourceDescription, ['fe_views', 'views', VIEW_TYPE_GLOBE, 'coordinateTitle']);

            results = func.groupDetailData(results, dataSourceDescription, usePercent);

            if (err) {
                return done(err);
            }

            if (results === undefined || results === null) {
                results = [];
            }

            var originDestinationPairs = _.map(results, function (el) {
                const coordTitle = coordinateTitleField
                    ? func.formatCoercedField(coordinateTitleField, el.coordTitle, dataSourceDescription, usePercent)
                    : el.coordTitle;

                return {
                    id: el._id,
                    origin: {
                        lat: el.latField,
                        lng: el.lngField
                    },
                    destination: {
                        lat: el.dLatField,
                        lng: el.dLonField

                    },
                    coordTitle,
                    detailData: el.detailData
                };
            });

            // create lines for each unique origin destination pair
            var lines = _.filter(originDestinationPairs, function(pair) {
                return pair.origin.lat && pair.origin.lng && pair.destination.lat && pair.destination.lng;
            });
            lines = _.uniqBy(lines, function(v, i) {
                return '' + v.origin.lat + 'x' + v.origin.lng + 'x' +
                    v.destination.lat + 'x' + v.destination.lng;
            });
            lines = _.map(lines, function(v, i) {
                return {
                    start: {
                        lat: parseFloat(v.origin.lat),
                        lng: parseFloat(v.origin.lng)
                    },
                    end: {
                        lat: parseFloat(v.destination.lat),
                        lng: parseFloat(v.destination.lng)
                    }
                };
            });

            // create points for all unique origins and destinations
            var points = [];
            _.each(originDestinationPairs, function(v, i) {
                if (v.origin.lat && v.origin.lng) {
                    points.push({
                        id: v.id,
                        lat: parseFloat(v.origin.lat),
                        lng: parseFloat(v.origin.lng),
                        coordinateTitle: v.coordTitle,
                        detailData: v.detailData
                    });
                }

                if (v.destination.lat && v.destination.lng) {
                    points.push({
                        id: v.id,
                        lat: parseFloat(v.destination.lat),
                        lng: parseFloat(v.destination.lng),
                        coordinateTitle: v.coordTitle,
                        detailData: v.detailData
                    });
                }
            });
            points = _.uniqBy(points, function(v, i) {
                return '' + v.lat + 'x' + v.lng;
            });

            // add counts to the points
            var originCounts = _.countBy(originDestinationPairs, function(v, i) {
                return v.origin.lat + 'x' + v.origin.lng;
            });

            var destinationCounts = _.countBy(originDestinationPairs, function(v, i) {
                return v.destination.lat + 'x' + v.destination.lng;
            });

            // NOTE: for frontend performance reasons, limit the amount of data returned
            // and warn the editor in the backend. If we add some more optimization to the
            // way the globe is rendered in three.js, we may be able to increase this limit
            var hardLimit = 10000;

            graphData = {
                data: {
                    lines: _.slice(lines, 0, hardLimit),
                    points: _.slice(points, 0, hardLimit)
                }
            };

            if (lines.length > hardLimit) {
                truncatedDataWarnings.push('This dataset generated ' + lines.length + ' lines, but has been truncated to ' + hardLimit + ' for performance reasons. You might want to use the Map view for this dataset instead of the Globe.');
            }
            if (points.length > hardLimit) {
                truncatedDataWarnings.push('This dataset generated ' + points.length + ' points, but has been truncated to ' + hardLimit + ' for performance reasons. You might want to use the Map view for this dataset instead of the Globe.');
            }

            done();
        };

        if (aggregationOperators.length > 0) {
            processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true)/* or we will hit mem limit on some pages*/.exec(doneFn);
        } else {
            processedRowObjects_mongooseModel.find({}).exec(doneFn);
        }
    });

    batch.end(function (err) {
        if (err) {
            winston.error('❌  Error preparing data for globe: ', err);
            return callback(err);
        }

        var data = {
            graphData,
            meta: {
                pointColor,
                numberOfResults: graphData.data.points.length,
                truncatedDataWarnings: truncatedDataWarnings
            }
        };

        winston.info('✅  done preparing data for globe');
        callback(null, data);
    });
};
