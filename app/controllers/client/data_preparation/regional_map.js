const winston = require('winston');
const Batch = require('batch');
const _ = require('lodash');
const validator = require('validator');

const { AGGREGATE_BY_DEFAULT_COLUMN_NAME } = require('../config');
const processed_row_objects = require('./../../../../app/models/processed_row_objects');
const func = require('../func');

module.exports.BindData = function (dataSourceDescription, options, callback) {
    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    var region = dataSourceDescription.fe_views.views.regionalMap.region || 'US/state';
    var regionField = dataSourceDescription.fe_views.views.regionalMap.regionField;

    if (!regionField) {
        return callback(new Error('Region Data Field is empty'));
    }

    // get selectedRegion definition from views lookup (via add-meta)
    var regionDefinitions = options.viewLookup.regionDefinitions;
    var selectedRegion = _.find(regionDefinitions, ['id', region]);

    var matchBy = 'name';
    var selectedMatchBy = _.find(selectedRegion.matchByOptions, ['property', matchBy]);

    // check if selected match by is not unique
    var matchByUnique = true,
        useGrandparent = false,
        parentMatchBy,
        parentRegionField,
        grandparentMatchBy,
        grandparentRegionField;

    if (!selectedMatchBy.unique) {
        matchByUnique = false;
        // we'll need some parent information to match data to regions
        parentMatchBy = 'name_parent';
        parentRegionField = dataSourceDescription.fe_views.views.regionalMap.parentRegionField;

        // and might need grandparent info as well (e.g. China county-level)
        if (selectedMatchBy.useGrandparent) {
            useGrandparent = true;
            grandparentMatchBy = 'name_grandparent';
            grandparentRegionField = dataSourceDescription.fe_views.views.regionalMap.grandparentRegionField;
        }
    }

    // this gets cached, so don't use it directly!
    var topoJson = require('./../../../data/topojson/regions/' + region + '/subdivisions.topo.json');

    // use this instead
    var topoJsonClone = _.cloneDeep(topoJson);
    // sort .objects.subdivisions.geometries alphabetically by properties.name
    topoJsonClone.objects.subdivisions.geometries.sort(function (a, b) {
        if (a.properties.name > b.properties.name) {
            return 1;
        }
        if (a.properties.name < b.properties.name) {
            return -1;
        }

        return 0;
    });

    var numberOfResults = 0;
    var missingDataWarnings = [];
    var unusedDataWarnings = [];

    var batch = new Batch();
    batch.concurrency(1);

    // Obtain grouped results
    batch.push(function (done) {
        //
        var aggregationOperators = [];
        var _orErrDesc;
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

        var totalQuery = { $sum: 1 };

        if (options.aggregateBy_realColumnName && options.aggregateBy_realColumnName !== AGGREGATE_BY_DEFAULT_COLUMN_NAME) {
            totalQuery['$sum'] = '$rowParams.' + options.aggregateBy_realColumnName;
        }

        aggregationOperators = aggregationOperators.concat(
            [
                { $unwind: '$rowParams.' + regionField },
                { // unique/grouping and summing stage
                    $group: {
                        _id: {
                            region: regionField ? '$rowParams.' + regionField : '',
                            parentRegion: parentRegionField ? '$rowParams.' + parentRegionField : '',
                            grandparentRegion: grandparentRegionField ? '$rowParams.' + grandparentRegionField : '',
                        },
                        total: totalQuery,
                        objectIds: { $addToSet: '$_id' },
                    },
                },
                { // reformat
                    $project: {
                        _id: 0,
                        regionId: '$_id.region',
                        parentRegionId: '$_id.parentRegion',
                        grandparentRegionId: '$_id.grandparentRegion',
                        total: 1,
                        objectIds: '$objectIds',
                    },
                },
                { // sort
                    $sort: {
                        regionId: 1,
                        parentRegionId: 1,
                        grandparentRegionId: 1,
                    },
                },
            ]);

        /**
         * Finds a match with the current regionId and (hopefully) a region in subdivisionIds.
         * If it finds a match depending on matchByUnique, it'll return true if it was successful and false otherwise.
         *
         * @param {boolean} matchByUnique - If we are only looking for one match
         * @param {boolean} useGrandparent - If we are looking for multiple matches using parent and grandparent ids
         * @param {array} subdivisionIds - Reigon Ids we are matching regionId against
         * @param {array} parentIds - Ids to match against parentRegionId
         * @param {string} parentRegionId
         * @param {array} grandparentIds - Ids to match against grandparentRegionId
         * @param {string} grandparentRegionId
         * @param {string} regionId - String Id we are trying to find in subdivisionIds
         */
        const matchWithTopoJsonData = (
            matchByUnique, useGrandparent, subdivisionIds,
            parentIds, parentRegionId, grandparentIds,
            grandparentRegionId, regionId,
        ) => {
            if (matchByUnique) {
                // match any of the possible ids from the topojson to the data
                return _.includes(subdivisionIds, regionId);
            } else {
                if (!useGrandparent) {
                    // match both the region id and its parent id against two fields in the data
                    return _.includes(subdivisionIds, regionId) && _.includes(parentIds, parentRegionId);
                } else {
                    // match the region id, parent id and grandparent id against three fields in the data
                    return _.includes(subdivisionIds, regionId) && _.includes(parentIds, parentRegionId) && _.includes(grandparentIds, grandparentRegionId);
                }
            }
        };

        var doneFn = function (err, results) {
            if (err) {
                return done(err);
            }
            if (!results) {
                results = [];
            }

            // cast to string, trim and lowercase results
            results.forEach(function (result) {
                /**
                 * If the regionId is a string perform the normal operation.
                 * If the regionId is an array, then we'll need to map the string operation
                 *  to all strings within the array.
                 */
                if (typeof result.regionId === 'string') {
                    result.regionComparator = result.regionId.toString().trim().toLowerCase();
                } else if (result.regionId) {
                    result.regionComparator = result.regionId.map(regionId => regionId.toString().trim().toLowerCase());
                } else {
                    // TODO: Investigate result.regionId being undefined
                    result.regionComparator = '';
                }

                result.parentRegionComparator = result.parentRegionId.toString().trim().toLowerCase();
                result.grandparentRegionComparator = result.grandparentRegionId.toString().trim().toLowerCase();
            });

            // loop through the subdivisions (e.g. provinces, states)
            // match data and add the queried data to their properties
            topoJsonClone.objects.subdivisions.geometries.forEach(function (subdivision) {

                // ids can be pipe delimited if there are alternates
                // also trim and lowercase them like we did to the results
                var subdivisionIds = subdivision.properties[matchBy];
                if (subdivisionIds) {
                    subdivisionIds = subdivisionIds.toString().split('|').map(function (subdivisionId) {
                        return subdivisionId.trim().toLowerCase();
                    });
                } else {
                    subdivisionIds = [];
                }

                // parent ids can be pipe delimited if there are alternates
                // also trim and lowercase them like we did to the results
                var parentIds = subdivision.properties[parentMatchBy];
                if (parentIds) {
                    parentIds = parentIds.toString().split('|').map(function (parentId) {
                        return parentId.trim().toLowerCase();
                    });
                } else {
                    parentIds = [];
                }

                // grandparent ids can be pipe delimited if there are alternates
                // also trim and lowercase them like we did to the results
                var grandparentIds = subdivision.properties[grandparentMatchBy];
                if (grandparentIds) {
                    grandparentIds = grandparentIds.toString().split('|').map(function (grandparentId) {
                        return grandparentId.trim().toLowerCase();
                    });
                } else {
                    grandparentIds = [];
                }

                const index = _.findIndex(results, function (result) {
                    const regionId = result.regionComparator;

                    if (typeof regionId === 'string') {
                        // If regionId is a string we just want to call matchWithTopoJsonData normally
                        return matchWithTopoJsonData(
                            matchByUnique, useGrandparent, subdivisionIds,
                            parentIds, result.parentRegionComparator, grandparentIds,
                            result.grandparentRegionComparator, regionId,
                        );
                    } else {
                        // regionId is an array so we'll need to perform matchWithTopoJsonData until we find a match
                        // TODO: Possibly refactor regional_map so that we can use delimited fields to match more
                        // fields than one
                        return regionId.some(id =>
                            matchWithTopoJsonData(
                                matchByUnique, useGrandparent, subdivisionIds,
                                parentIds, result.parentRegionComparator, grandparentIds,
                                result.grandparentRegionComparator, id,
                            ),
                        );
                    }
                });

                var match;
                if (index >= 0) {
                    match = results[index];
                    results.splice(index, 1);
                    numberOfResults++;

                    // add the queried data
                    subdivision.properties.total = match.total;
                    subdivision.properties.region = match.regionId;
                    subdivision.properties.parentRegion = match.parentRegionId;
                    subdivision.properties.grandparentRegion = match.grandparentRegionId;

                    // if there's only one object in the aggregate results, pass along the objectId so the frontend can
                    // easily link to it
                    if (match.objectIds.length === 1) {
                        subdivision.properties.isSingleResult = true;
                        subdivision.properties.objectId = match.objectIds[0];
                    }

                } else {
                    missingDataWarnings.push('Could not find data for "' + subdivision.properties[matchBy].split('|')[0] + '"');
                }
            });

            // log results that didn't get attached to the topoJsonClone
            unusedDataWarnings = results.map(function (result) {
                return 'Result for "' + validator.escape(result.regionId) + '" was not used';
            });

            // limit warnings to 10 of each category and a count of additional ones
            var initialLength,
                limit = 10;

            initialLength = missingDataWarnings.length;
            missingDataWarnings = missingDataWarnings.slice(0, Math.min(limit, initialLength));
            if (missingDataWarnings.length !== initialLength) {
                missingDataWarnings.push('...and ' + (initialLength - limit) + ' more like this.');
            }

            initialLength = unusedDataWarnings.length;
            unusedDataWarnings = unusedDataWarnings.slice(0, Math.min(limit, initialLength));
            if (unusedDataWarnings.length !== initialLength) {
                unusedDataWarnings.push('...and ' + (initialLength - limit) + ' more like this.');
            }

            done();
        };
        processedRowObjects_mongooseModel.aggregate(aggregationOperators).allowDiskUse(true).exec(doneFn);
    });

    batch.end(function (err) {
        if (err) {
            return callback(err);
        }

        var graphData = {
            data: topoJsonClone,
        };

        var data =
            {
                // graphData contains all the data rows; used by the template to create the linechart
                graphData,
                meta: {
                    numberOfResults,
                    region,
                    matchBy,
                    regionField,
                    parentRegionField,
                    grandparentRegionField,
                    missingDataWarnings,
                    unusedDataWarnings,
                    isAggreagtedByPercent: func.isPercentOperation(dataSourceDescription, options.aggregateBy_realColumnName)
                },
            };

        winston.info('Returning data');

        callback(err, data);
    });
};
