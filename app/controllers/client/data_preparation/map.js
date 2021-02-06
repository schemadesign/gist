const winston = require('winston');
const Batch = require('batch');
const _ = require('lodash');

let { AGGREGATE_BY_DEFAULT_COLUMN_NAME, AGGREGATE_BY_DISABLED_COLUMN_NAME } = require('../config');
const { MAP_STYLE_COUNTRY, MAP_STYLE_HEATMAP } = require('../../../config/views.config');
const processed_row_objects = require('../../../models/processed_row_objects');
const func = require('../func');

// Prepare country geo data cache
let __countries_geo_json = require('./../../../data/countries.geo.json');
const cache_countryIdToCountry = {};
const cache_countryNameToIdDict = require('./../../../data/countryNameToId.json');
const UNKNOWN_ISO_CODE = '-99';
const { getMaxValue } = require('./data_prep_helpers/map.helpers');
const numCountries = __countries_geo_json.features.length;
for (let i = 0; i < numCountries; i++) {
    const countryFeature = __countries_geo_json.features[i];
    const { ADM0_A3, ISO_A3, NAME } = countryFeature.properties;
    const countryId = ISO_A3 === UNKNOWN_ISO_CODE ? ADM0_A3 : ISO_A3;
    const geometry = countryFeature.geometry;
    cache_countryIdToCountry[countryId] = { name: NAME, code: countryId };
    cache_countryIdToCountry[countryId].geometry = geometry;
}

__countries_geo_json = undefined; // free
const DB_SCAN_THRESHOLD = 200;

function aggByNumberOfItems(aggregationOperators, coordTitle, latField, lngField) {
    const aggregationQuery = [
        { $unwind: '$rowParams.' + coordTitle },
        { $unwind: '$rowParams.' + lngField },
        { $unwind: '$rowParams.' + latField },
        {
            $group: {
                _id: {
                    mapBy: '$rowParams.' + coordTitle,
                    lngField: '$rowParams.' + lngField,
                    latField: '$rowParams.' + latField,
                },
                value: { $addToSet: '$_id' },
            },
        },
        {
            $project: {
                _id: 0,
                id: '$value',
                coordTitle: '$_id.mapBy',
                lngField: '$_id.lngField',
                latField: '$_id.latField',
                coordRadiusValue: { $size: '$value' },
            },
        },
    ];

    return [...aggregationOperators, ...aggregationQuery];
}

function aggByDisabled(aggregationOperators, coordTitle, latField, lngField) {
    const aggregationQuery = [
        { $unwind: '$rowParams.' + coordTitle },
        { $unwind: '$rowParams.' + lngField },
        { $unwind: '$rowParams.' + latField },
        {
            $group: {
                _id: {
                    mapBy: '$rowParams.' + coordTitle,
                    lngField: '$rowParams.' + lngField,
                    latField: '$rowParams.' + latField,
                },
                value: { $addToSet: '$_id' },
            },
        },
        {
            $project: {
                _id: 0,
                id: '$value',
                coordTitle: '$_id.mapBy',
                lngField: '$_id.lngField',
                latField: '$_id.latField',
            },
        },
    ];

    return [...aggregationOperators, ...aggregationQuery];
}

function aggByParameter(aggregationOperators, coordTitle, latField, lngField, options) {
    const aggregationQuery = [
        { $unwind: '$rowParams.' + coordTitle },
        { $unwind: '$rowParams.' + lngField },
        { $unwind: '$rowParams.' + latField },
        { $unwind: '$rowParams.' + options.aggregateBy_realColumnName },
        {
            $group: {
                _id: {
                    mapBy: '$rowParams.' + coordTitle,
                    lngField: '$rowParams.' + lngField,
                    latField: '$rowParams.' + latField,
                    coordRadiusValue: '$rowParams.' + options.aggregateBy_realColumnName,
                },
                value: { $addToSet: '$_id' },
            },
        },
        {
            $project: {
                _id: 0,
                id: '$value',
                coordTitle: '$_id.mapBy',
                lngField: '$_id.lngField',
                latField: '$_id.latField',
                coordRadiusValue: '$_id.coordRadiusValue',
            },
        },
    ];

    return [...aggregationOperators, ...aggregationQuery];
}

module.exports.BindData = (dataSourceDescription, options, callback) => {
    const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(
        dataSourceDescription._id
    );
    const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    const mapFeatures = [];
    const coordFeatures = [];
    const {
        latitudeField: latField,
        longitudeField: lngField,
        mapStyle,
        defaultMapByColumnName,
        defaultColorByColumnName,
        colorByField,
        displayAggregate,
        sortAlphabetically = false,
    } = dataSourceDescription.fe_views.views.map;
    let noiseLevel = 1;
    let highestValue = 0;
    let coordRadiusValue;
    let coordTitle;
    const batch = new Batch();
    batch.concurrency(1);

    // Coordinate Map
    if ([MAP_STYLE_HEATMAP, MAP_STYLE_COUNTRY].includes(mapStyle)) {
        // Obtain grouped results
        batch.push(done => {
            let aggregationOperators = [];
            let _orErrDesc;
            if (options.isSearchActive) {
                _orErrDesc = func.activeSearch_matchOp_orErrDescription(
                    dataSourceDescription,
                    options.searchCol,
                    options.searchQ
                );
                if (_orErrDesc.err) {
                    return done(_orErrDesc.err);
                }

                aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
            }
            if (options.isFilterActive) {
                // rules out undefined filterCol
                _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(
                    dataSourceDescription,
                    options.filterObj
                );
                if (_orErrDesc.err) {
                    return done(_orErrDesc.err);
                }

                aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
            }

            const totalQuery = { $sum: 1 };

            if (
                options.aggregateBy_realColumnName &&
                ![AGGREGATE_BY_DEFAULT_COLUMN_NAME, AGGREGATE_BY_DISABLED_COLUMN_NAME].includes(
                    options.aggregateBy_realColumnName
                )
            ) {
                totalQuery['$sum'] = '$rowParams.' + options.aggregateBy_realColumnName;
            }

            const aggregationQuery = [
                { $unwind: '$rowParams.' + options.mapBy_realColumnName },
                {
                    // unique/grouping and summing stage
                    $group: {
                        _id: {
                            mapBy: '$rowParams.' + options.mapBy_realColumnName,
                        },
                        id: { $first: '$_id' },
                        colorBy: { $first: `$rowParams.${defaultColorByColumnName}` },
                        count: { $sum: 1 },
                        total: totalQuery,
                    },
                },
                {
                    // reformat
                    $project: {
                        _id: 0,
                        name: '$_id.mapBy',
                        colorBy: 1,
                        id: 1,
                        count: 1,
                        total: 1,
                    },
                },
            ];

            aggregationOperators = aggregationOperators.concat(aggregationQuery);

            const doneFn = (err, _groupedResults) => {
                if (err) {
                    return done(err);
                }

                const dataset = [];

                if (_groupedResults === undefined || _groupedResults === null) {
                    _groupedResults = [];
                }

                _groupedResults.forEach((el, i) => {
                    const objectId = el.count === 1 ? el.id : '';
                    const countryName = el.name;
                    if (countryName === null) {
                        return; // skip
                    }
                    const countAtCountry = el.total;
                    if (countAtCountry > highestValue) {
                        highestValue = countAtCountry;
                    }
                    const countAtCountry_str = '' + countAtCountry;
                    const formattedCountryName = countryName
                        .toString()
                        .toLowerCase()
                        .trim()
                        .replace(/ /g, '_');
                    const countryId = cache_countryNameToIdDict.countries[formattedCountryName];

                    if (!countryId || !_.has(cache_countryIdToCountry, countryId)) {
                        return winston.warn(
                            `No known geometry for country named ${countryId} country name ${formattedCountryName}`
                        );
                    }

                    const total = parseInt(countAtCountry_str, 10);
                    if (total < 0) {
                        return winston.warn('Negative total for country named "' + countryName + '"');
                    }

                    const geometryForCountry = cache_countryIdToCountry[countryId].geometry;
                    const brandColorAccent = dataSourceDescription.brandColor.accent;

                    const color = colorByField
                        ? _.get(dataSourceDescription, ['colorMapping', el.colorBy], brandColorAccent)
                        : brandColorAccent;

                    mapFeatures.push({
                        type: 'Feature',
                        id: '' + i,
                        properties: {
                            id: el._id,
                            total: total,
                            code: cache_countryIdToCountry[countryId].code,
                            name: countryName,
                            color,
                            objectId,
                        },
                        geometry: geometryForCountry,
                    });

                    dataset.push(geometryForCountry);
                });
                done();
            };
            processedRowObjects_mongooseModel
                .aggregate(aggregationOperators)
                .allowDiskUse(true) /* or we will hit mem limit on some pages*/
                .exec(doneFn);
        });
    } else {
        batch.push(done => {
            let aggregationOperators = [];
            let _orErrDesc;
            if (options.isSearchActive) {
                _orErrDesc = func.activeSearch_matchOp_orErrDescription(
                    dataSourceDescription,
                    options.searchCol,
                    options.searchQ
                );
                if (_orErrDesc.err) {
                    return done(_orErrDesc.err);
                }

                aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
            }
            if (options.isFilterActive) {
                // rules out undefined filterCol
                _orErrDesc = func.activeFilter_matchOp_orErrDescription_fromMultiFilter(
                    dataSourceDescription,
                    options.filterObj
                );
                if (_orErrDesc.err) {
                    return done(_orErrDesc.err);
                }

                aggregationOperators = aggregationOperators.concat(_orErrDesc.matchOps);
            }

            if (options.aggregateBy_realColumnName === AGGREGATE_BY_DEFAULT_COLUMN_NAME) {
                aggregationOperators = aggByNumberOfItems(
                    aggregationOperators,
                    dataSourceDescription.objectTitle,
                    latField,
                    lngField
                );
            } else if (!displayAggregate) {
                aggregationOperators = aggByDisabled(
                    aggregationOperators,
                    dataSourceDescription.objectTitle,
                    latField,
                    lngField
                );
            } else {
                aggregationOperators = aggByParameter(
                    aggregationOperators,
                    dataSourceDescription.objectTitle,
                    latField,
                    lngField,
                    options
                );
            }

            aggregationOperators = func.publishMatch(aggregationOperators);

            const doneFn = (err, _coordDocs) => {
                if (err) {
                    return done(err);
                }

                coordRadiusValue = options.aggregateBy_realColumnName;
                let coordValue;
                const clustering = require('density-clustering');
                const dbscan = new clustering.DBSCAN();
                const dataset = [];

                coordTitle = defaultMapByColumnName;

                if (_coordDocs === undefined || _coordDocs === null) {
                    _coordDocs = [];
                }

                // Bail out of data processing if there are an excessive # of coordinate pairs
                if (_coordDocs.length > 10000) {
                    winston.info('number of coordinate pairs exceeds limit; discontinue data processing');
                    return callback(err, { docs: [], undisplayableData: true });
                }

                _coordDocs.forEach(el => {
                    const objectId = _.size(el.id) === 1 ? el.id[0] : el._id;

                    if (coordRadiusValue !== undefined) {
                        coordValue = Number.parseInt(el.coordRadiusValue);

                        coordFeatures.push({
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [el.lngField, el.latField],
                            },
                            properties: {
                                name: el.coordTitle,
                                total: coordValue || 1,
                                objectId,
                            },
                        });
                        dataset.push([el.lngField, el.latField]);
                    } else {
                        coordFeatures.push({
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [el.rowParams[lngField], el.rowParams[latField]],
                            },
                            properties: {
                                name: el.rowParams[coordTitle],
                                objectId,
                            },
                        });

                        dataset.push([el.rowParams[lngField], el.rowParams[latField]]);
                    }
                });

                if (dataset.length < DB_SCAN_THRESHOLD) {
                    winston.info("Running density-clustering algorithm to calculate this dataset's noise");
                    // parameters: 5 - neighborhood radius, 2 - number of points in neighborhood to form a cluster
                    dbscan.run(dataset, 5, 2);
                    noiseLevel = dbscan.noise.length;
                    winston.info(`Noise level:${noiseLevel}`);
                }

                done();
            };

            if (aggregationOperators.length > 0) {
                processedRowObjects_mongooseModel
                    .aggregate(aggregationOperators)
                    .allowDiskUse(true)
                    .exec(doneFn);
            } else {
                processedRowObjects_mongooseModel
                    .find({})
                    .lean()
                    .exec(doneFn);
            }
        });
    }

    batch.end(async err => {
        if (err) {
            return callback(err);
        }

        const features = mapFeatures.concat(coordFeatures);
        const sortedFeatures = sortAlphabetically
            ? _.sortBy(features, ['properties.name'])
            : _.reverse(_.sortBy(features, ['properties.total']));

        const collection = {
            type: 'FeatureCollection',
            features: sortedFeatures,
        };

        const isPercentValue = columnName => func.isPercentOperation(dataSourceDescription, columnName);
        const isAggregateByPercent = isPercentValue(options.aggregateBy_realColumnName);
        const isMapByPercent = isPercentValue(options.mapBy_realColumnName);

        const data = {
            // graphData contains all the data rows; used by the template to create the visualization
            graphData: {
                data: collection,
                fields: dataSourceDescription.raw_rowObjects_coercionScheme,
            },
            docs: collection.features.length ? [1] : [], // For determining if there is any data in view
            meta: {
                numberOfResults: collection.features.length,
                coordTitle: options.mapBy_realColumnName,
                maxValue: await getMaxValue(options, dataSourceDescription),
                isAggregateByPercent,
                isMapByPercent,
            },
        };

        winston.info('Returning data');

        callback(err, data);
    });
};
