var winston = require('winston');
var Batch = require('batch');
var _ = require('lodash');

const { SORT_ORDER_ASC, SORT_ORDER_DESC } = require('../../../config/sort.config');
var importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
var processed_row_objects = require('../../../models/processed_row_objects');
const { fieldOverrideIfExists, formatCoercedField } = require('../func');
var config = require('../config');
const { addDefaultAggregationOperators } = require('./data_prep_helpers/aggregation.helpers');
var constructedFilterObj = require('../../../../nunjucks/constructed-filter-obj').constructedFilterObj;
const { constructedRoutePath } = require('../../../../shared/url');

module.exports.BindData = function(dataSourceDescription, sampleDoc, options, callback) {
    var processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(
        dataSourceDescription._id
    );
    var processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

    const wholeFilteredSetAggregationOperators = addDefaultAggregationOperators(dataSourceDescription, options);

    var nonpagedCount = 0;
    var docs;
    var pageRanges;
    let columns;
    let columnNames;
    var mainTableKeys;
    var sortDirection = dataSourceDescription.fe_views.views.table.defaultSortOrderDescending ?
        SORT_ORDER_DESC :
        SORT_ORDER_ASC;
    var fieldsNotToLinkAsFilter_byColName = {};

    var retrieveImageURLFromDoc = function(bucket, subdomain, docPKey, datasetId, viewType) {
        return (
            'https://' +
            bucket +
            '.nyc3.digitaloceanspaces.com/' +
            subdomain +
            '/datasets/' +
            datasetId +
            '/assets/images/' +
            viewType +
            '/' +
            docPKey
        );
    };

    var batch = new Batch();
    batch.concurrency(1);

    // Count whole set
    batch.push(function(done) {
        var countWholeFilteredSetAggregationOperators = wholeFilteredSetAggregationOperators.concat([
            {
                // Count
                $count: 'count',
            },
        ]);
        var doneFn = function(err, results) {
            if (err) {
                return done(err);
            }

            if (results !== undefined && results !== null && results.length > 0) {
                nonpagedCount = results[0].count;
            }

            done();
        };

        processedRowObjects_mongooseModel
            .aggregate(countWholeFilteredSetAggregationOperators)
            .allowDiskUse(true) /* or we will hit mem limit on some pages*/
            .exec(doneFn);
    });

    // Obtain Paged Docs
    batch.push(function(done) {
        sortDirection = options.sortDirection ? options.sortDirection : sortDirection;
        var sortByRealColumnNamePath = 'rowParams.' + options.sortBy_realColumnName;
        // Convert to number for mongo sorting
        var sortDir = sortDirection === SORT_ORDER_ASC ? 1 : -1;
        var sortOpParams = { sortBy: sortDir };
        sortOpParams.size = -sortDir;

        var projects = {
            $project: {
                _id: 1,
                pKey: '$pKey',
                srcDocPKey: '$srcDocPKey',
                sortBy: '$' + sortByRealColumnNamePath,
                size: {
                    $cond: {
                        if: { $isArray: '$' + sortByRealColumnNamePath },
                        then: { $size: '$' + sortByRealColumnNamePath }, // gets the number of items in the array
                        else: 0,
                    },
                },
            },
        };

        var filteredRowParamsFields;
        var nestedObjectIsArray = false;

        // if it's a nested table, the column names will be the nested object keys
        if (options.nestedArray && options.nestedArray.length > 0) {
            var rowParamsObj = sampleDoc.rowParams;
            options.nestedArray.forEach(function(nestedKey) {
                if (Array.isArray(rowParamsObj)) {
                    rowParamsObj = rowParamsObj[0][nestedKey];
                } else {
                    rowParamsObj = rowParamsObj[nestedKey];
                }
            });

            // if the object is [{foo: bar}, {foo: baz}]
            if (Array.isArray(rowParamsObj) && typeof rowParamsObj[0] === 'object') {
                nestedObjectIsArray = true;
                // essentially flatten the array of objects and include the other columns in the nested table for
                // reference take the first object in the array to access the keys
                rowParamsObj = rowParamsObj[0];
                mainTableKeys = Object.keys(sampleDoc.rowParams).filter(
                    field => options.nestedArray.indexOf(field) === -1
                );
            }
            filteredRowParamsFields = Object.keys(rowParamsObj);
        } else {
            // Exclude the nested pages fields to reduce the amount of data returned
            var rowParamsfields = Object.keys(sampleDoc.rowParams);
            // Exclude fe excluded fields
            filteredRowParamsFields = rowParamsfields.filter(
                field =>
                    dataSourceDescription.fe_excludeFields && dataSourceDescription.fe_excludeFields[field] === false
            );
        }

        filteredRowParamsFields.forEach(function(rowParamsField) {
            if (options.nestedArray && options.nestedArray.length > 0) {
                projects['$project']['rowParams.' + rowParamsField] =
                    '$rowParams.' + options.nestedPath + '.' + rowParamsField;
            } else if (
                dataSourceDescription.fe_nestedObject === null ||
                rowParamsField.indexOf(dataSourceDescription.fe_nestedObject.prefix) === -1
            ) {
                projects['$project']['rowParams.' + rowParamsField] = '$rowParams.' + rowParamsField;
            }
        });

        if (nestedObjectIsArray) {
            wholeFilteredSetAggregationOperators.push({ $unwind: '$rowParams.' + options.nestedPath });
            mainTableKeys.forEach(function(field) {
                projects['$project']['rowParams.' + field] = '$_id.rowParams.' + field;
            });
        }

        // TODO: rename calculateGalleryPageRanges if its used across multiple visualizations
        pageRanges = config.calculateGalleryPageRanges(nonpagedCount);

        var pagedDocs_aggregationOperators = wholeFilteredSetAggregationOperators.concat([
            projects,
            // Sort (before pagination):
            { $sort: sortOpParams },
            // Pagination
            { $skip: options.skipNResults },
            { $limit: options.limit },
        ]);

        // Filter out view fieldsNotAvailable
        const excludeViewFieldsNotAvailable = columns => {
            return columns.filter(({ name }) => {
                const realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(
                    name,
                    dataSourceDescription
                );

                if (dataSourceDescription.fe_views.views.table.fieldsNotAvailable) {
                    return dataSourceDescription.fe_views.views.table.fieldsNotAvailable.indexOf(realColumnName) === -1;
                }
                return true;
            });
        };

        var formatDocData = function(docs, columns) {
            docs = docs.map(function(doc) {
                // url
                var subdomain = dataSourceDescription._team.subdomain.toLowerCase();
                var bucket = process.env.DO_S3_BUCKET;

                if (!_.isEmpty(doc.rowParams[dataSourceDescription.fe_image.field])) {
                    doc.url = retrieveImageURLFromDoc(
                        bucket,
                        subdomain,
                        doc.pKey,
                        dataSourceDescription._id,
                        'timeline'
                    );
                }

                // Filter out view fieldsNotAvailable
                columns = excludeViewFieldsNotAvailable(columns);

                for (var i = 0; i < columns.length; i++) {
                    // fe_displaytitleoverride
                    if (dataSourceDescription.fe_displayTitleOverrides.hasOwnProperty(columns[i].originalName)) {
                        var cellData = doc.rowParams[columns[i].originalName];
                        delete doc.rowParams[columns[i].originalName];
                        doc.rowParams[columns[i].originalName] = cellData;
                    }

                    // format cellData
                    try {
                        doc.rowParams[columns[i].name] = formatCoercedField(
                            columns[i].originalName,
                            doc.rowParams[columns[i].originalName],
                            dataSourceDescription
                        );
                    } catch (e) {
                        winston.error(
                            'There are no raw row objects for the dataset: ' + dataSourceDescription._id + '.'
                        );
                        return done(e);
                    }
                }
                return doc;
            });

            return docs;
        };

        var isObject = function(value) {
            var stringValue = JSON.stringify(value);
            if (stringValue[0] === '{' || stringValue[0] === '[') {
                return true;
            } else {
                return false;
            }
        };

        var doneFn = function(err, _docs) {
            if (err) {
                return done(err);
            }
            docs = _docs;
            if (typeof docs === 'undefined' || docs === null) {
                docs = [];
            } else if (docs.length > 0) {
                for (var i = 0; i < docs.length; i++) {
                    if (docs[i].hasOwnProperty('rowParams')) {
                        docs[0] = docs[i];
                        break;
                    }
                }

                if (options.nested) {
                    try {
                        columns = Object.keys(docs[0].rowParams).map(name => ({ name }));
                    } catch (e) {
                        winston.error(
                            'There was an error getting the columnNames from the first doc. Something is probably wrong with the sampleDoc findQuery. :' +
                                e
                        );
                        return done(e);
                    }

                    if (mainTableKeys) {
                        docs = formatDocData(docs, mainTableKeys);
                    }
                } else {
                    columns = importedDataPreparation.HumanReadableFEVisibleColumns(dataSourceDescription);
                    docs = formatDocData(docs, columns);
                }

                // Filter out view fieldsNotAvailable
                columns = excludeViewFieldsNotAvailable(columns);

                var page = options.onPageNum !== 1 ? options.onPageNum : '';
                var unsetColumnWidthCount = columns.length;
                var columnWidthTotal = 0;

                columnNames = columns.map(function({ name, originalName }) {
                    var nameObject = {};
                    if (_.isNil(docs[0].rowParams[name])) {
                        docs[0].rowParams[name] = '';
                    }
                    if (isObject(docs[0].rowParams[name])) {
                        nameObject.hasObjectValue = true;
                    } else {
                        nameObject.hasObjectValue = false;
                    }

                    nameObject['mainTableKey'] = false;

                    if (mainTableKeys) {
                        nameObject['mainTableKey'] = mainTableKeys.indexOf(name) !== -1;
                    }

                    nameObject.name = name;
                    nameObject.originalName = originalName;

                    var sortNewDirection = sortDirection === SORT_ORDER_DESC ? SORT_ORDER_ASC : SORT_ORDER_DESC;
                    var sortNewDirectionUrl;
                    sortNewDirectionUrl = constructedRoutePath(options.routePath_base, options.filterObj, {
                        searchCol: options.searchCol,
                        searchQ: options.searchQ,
                        sortBy: options.sortBy,
                        sortDirection: sortNewDirection,
                        nested: options.nestedArray,
                        limit: options.limit,
                        page: page,
                    });
                    nameObject.sortNewDirectionUrl = sortNewDirectionUrl;

                    var sortByBasePath = constructedRoutePath(options.routePath_base, options.filterObj, {
                        searchCol: options.searchCol,
                        searchQ: options.searchQ,
                        page: page,
                        sortDirection: sortNewDirection,
                        nested: options.nestedArray,
                        limit: options.limit,
                        sortBy: '',
                    });
                    nameObject.sortByBasePath = sortByBasePath;

                    var nestedFilterObj = options.constructedNestedObj(
                        options.nestedArray,
                        nameObject.name,
                        mainTableKeys
                    );
                    var nestedFilterLink = constructedRoutePath(options.routePath_base, nestedFilterObj, {
                        searchQ: options.searchQ,
                        searchCol: options.searchCol,
                        sortBy: options.sortBy,
                        sortCol: options.sortCol,
                        limit: options.limit,
                        page: page,
                    });
                    nameObject.nestedFilterLink = nestedFilterLink;

                    // set explicit column widths and keep track of how many are unset
                    var columnWidths = dataSourceDescription.fe_views.views.table.columnWidths;
                    const realColumnName = importedDataPreparation.RealColumnNameFromHumanReadableColumnName(
                        nameObject.name,
                        dataSourceDescription
                    );
                    if (typeof columnWidths !== 'undefined' && typeof columnWidths[realColumnName] === 'number') {
                        var width = columnWidths[realColumnName];
                        const minTableWidth = 698;
                        nameObject.width = width;
                        // Set minwidth to same percentage of pixels that add up to minTableWidth
                        nameObject.minWidth = minTableWidth * width * 0.01 + 'px';
                        columnWidthTotal += width;
                        unsetColumnWidthCount--;
                    }

                    return nameObject;
                });

                // if there are any columns left, space them out evenly
                if (unsetColumnWidthCount >= 0) {
                    columnNames.forEach(function(columnName) {
                        if (!columnName.width) {
                            columnName.width = (100 - columnWidthTotal) / unsetColumnWidthCount;
                        }
                        columnName.width += '%';
                    });
                }

                docs.forEach(function(doc) {
                    doc.urlForFilterValues = {};

                    const createUrl = ({ columnName, value }) => {
                        const filterObjForThisFilterColVal = constructedFilterObj(
                            options.filterObj,
                            columnName.name,
                            value,
                            false
                        );
                        return constructedRoutePath(options.routePath_base, filterObjForThisFilterColVal, {
                            searchQ: options.searchQ,
                            searchCol: options.searchCol,
                            sortBy: options.sortBy,
                            sortCol: options.sortCol,
                            page: page,
                        });
                    };

                    columnNames.forEach(function(columnName) {
                        const value = doc.rowParams[columnName.name];
                        if (_.isArray(value)) {
                            doc.urlForFilterValues[columnName.name] = [];
                            value.forEach((name, index) => {
                                doc.urlForFilterValues[columnName.name][index] = createUrl({ columnName, value: name });
                            });

                            return;
                        }

                        doc.urlForFilterValues[columnName.name] = createUrl({ columnName, value });
                    });
                });
            }
            done();
        };

        // Next, get the full set of sorted results
        processedRowObjects_mongooseModel
            .aggregate(pagedDocs_aggregationOperators)
            .allowDiskUse(true) // or we will hit mem limit on some pages
            .exec(doneFn);
    });

    batch.push(function(done) {
        // Get list of fields that aren't filters
        const fe_filters_fieldsNotAvailable = dataSourceDescription.fe_filters.fieldsNotAvailable;
        if (typeof fe_filters_fieldsNotAvailable !== 'undefined') {
            for (var key in fe_filters_fieldsNotAvailable) {
                const fieldName = fieldOverrideIfExists(fe_filters_fieldsNotAvailable[key], dataSourceDescription);

                fieldsNotToLinkAsFilter_byColName[fieldName] = true;
            }
        }

        done();
    });

    batch.end(function(err) {
        if (err) {
            winston.error('Error preparing data for table: ', err);
            return callback(err);
        }

        var data = {
            data: docs,
            included: {
                dataSource: dataSourceDescription,
            },
            meta: {
                // only put things here that are needed post ajax data fetch
                // to dynamically generate html/svg
                numberOfResults: docs.length,
                pageSize: options.limit < nonpagedCount ? options.limit : nonpagedCount,
                numPages: Math.ceil(nonpagedCount / options.limit),
                nonpagedCount: nonpagedCount,
                pageRanges: pageRanges,
                onPageNum: options.onPageNum,
                mainTableKeys: mainTableKeys,
                columnNames: columnNames,
                resultsOffset: options.resultsOffset,
                sortDirection: sortDirection,
                routePath_base: options.routePath_base,
                filterObj: options.filterObj,
                fieldsNotToLinkAsFilter_byColName: fieldsNotToLinkAsFilter_byColName,
            },
        };

        winston.info('done preparing data for table');
        callback(null, data);
    });
};
