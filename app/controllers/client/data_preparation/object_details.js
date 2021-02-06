const { defaultTo, get, partialRight, assignWith } = require('lodash');
const Batch = require('batch');
const queryString = require('querystring');
const winston = require('winston');
const oembed = require('oembed');
const _ = require('lodash');

const importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
const datasource_description = require('../../../models/descriptions');
const raw_source_documents = require('../../../models/raw_source_documents');
const processed_row_objects = require('../../../models/processed_row_objects');
const config = require('../config');
const func = require('../func');
const User = require('../../../models/users');
const Story = require('../../../models/stories');
const oEmbedProviders = require('../../../data/oembed-providers');
const libraries = require('../../../libs/middleware/views/libraryList');
const { checkConditionAndApplyClasses } = require('./data_prep_helpers/image.helpers');

function fetchOEmbed(url, cb) {
    oembed.fetch(url, null, function (err, res) {
        if (err) {
            cb(err);

        } else {
            // Calculate aspect ratio from width and height, fall back to 4:3
            const embedAspectRatio = res.height && res.width ? (res.height / res.width) * 100 : 75;

            // Generate embed code
            const embedHTML = '<div class="embed-responsive" style="padding-bottom: ' + embedAspectRatio + '%;">' + res.html + '</div>';

            cb(null, embedHTML);
        }
    });
}

function matchAndReplaceOEmbedsInField(rowObject, field, done) {

    if (!rowObject.rowParams[field]) {
        winston.warn(`No rowParams value for field: ${field}`);
        done();
    }

    const oEmbedPromises = [];
    let oEmbedMatches;
    const regex = new RegExp(oEmbedProviders, 'gi');

    try {
        oEmbedMatches = rowObject.rowParams[field].match(regex);
    } catch (err) {
        winston.info(err);
    }

    if (oEmbedMatches && oEmbedMatches.length) {
        Object.keys(oEmbedMatches).forEach(function (key) {

            const matchedUrl = oEmbedMatches[key];

            // Filter out accidental matches
            if (
                matchedUrl !== undefined &&
                matchedUrl.toString().substring(0, 4) === 'http'
            ) {
                oEmbedPromises.push(
                    new Promise(function (resolve, reject) {
                        fetchOEmbed(matchedUrl, function (err, res) {
                            if (err) {
                                winston.warn(`No oEmbed links discovered for url ${matchedUrl}`);
                                reject(err);

                            } else {
                                // Replace matched url in text with embed code
                                rowObject.rowParams[field] = rowObject.rowParams[field].replace(matchedUrl, res);

                                resolve();
                            }
                        });
                    }),
                );
            }
        });

        // Resolve when all oEmbeds in field have been replaced with embed codes
        Promise.all(oEmbedPromises).then(function () {
            done();
        }).catch(function () {
            done();
        });

    } else {
        done();
    }
}

// @todo: we can refactoring this, including splitting apart the page
// render from the DataPrep. But since it's just one object it's not as important
// to do that right away.

module.exports.BindData = function (req, source_pKey, rowObject_id, askForPreview, revision = null, callback) {
    let dataSourceDescription;

    const batch = new Batch();
    batch.concurrency(1);
    let sharedPage;
    let routePath_base;

    batch.push(function (done) {
        if (req.query.datasetId) { //for share page
            sharedPage = true;
            routePath_base = '/s/' + req.params.shared_page_id;

            datasource_description.findById(req.query.datasetId).populate('_team').exec(function (err, descr) {
                if (err) {
                    return done(err);
                }
                if (!descr) {
                    return done(new Error('dataset not found'));
                }
                dataSourceDescription = descr;

                source_pKey = dataSourceDescription.uid;
                return done();
            });

        } else {
            sharedPage = false;
            importedDataPreparation.DataSourceDescriptionWithPKey(askForPreview, source_pKey, revision).then(function (dataset_descri) {
                dataSourceDescription = dataset_descri;

                return done();
            }).catch(done);

        }
    });

    batch.end(function (err) {

        if (err) {
            return callback(err);
        }

        const processedRowObjects_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(dataSourceDescription._id);
        const processedRowObjects_mongooseModel = processedRowObjects_mongooseContext.Model;

        let rowObject;
        let relationshipField;
        let relationshipSource_uid;

        const batch = new Batch();
        batch.concurrency(1);

        batch.push(function (done) {
            processedRowObjects_mongooseModel.findById(rowObject_id, function (err, _rowObject) {
                if (err) {
                    return done(err);
                }
                if (!_rowObject) {
                    return done(new Error('Could not find row object for ' + rowObject_id));
                }

                rowObject = _rowObject;
                done();
            });
        });

        // google analytics
        const has_google_analytics = !!dataSourceDescription._team.google_analytics;
        let google_analytics_id;
        if (has_google_analytics) {
            google_analytics_id = dataSourceDescription._team.google_analytics;
        }

        const galleryViewSettings = get(dataSourceDescription, 'fe_views.views.gallery') || get(dataSourceDescription, 'fe_views.views.timeline') || {};
        let galleryItem_htmlWhenMissingImage;

        if (galleryViewSettings.galleryItemConditionsForIconWhenMissingImage) {
            const { galleryItemConditionsForIconWhenMissingImage } = galleryViewSettings;

            const wrapHeaderIcon = (conditions, value) => {
                const html = checkConditionAndApplyClasses(dataSourceDescription._team.subdomain, conditions, value);

                return html ? `<div class="object-header-icon">${html}</div>` : '';
            };

            galleryItem_htmlWhenMissingImage = ({ rowParams }) => {
                const { field, conditions } = galleryItemConditionsForIconWhenMissingImage;
                const fieldValue = rowParams[field];

                if (_.isArray(fieldValue)) {
                    return fieldValue.map(value => wrapHeaderIcon(conditions, value)).join('');
                }

                return wrapHeaderIcon(conditions, fieldValue);
            };
        }

        batch.push(function (done) {
            const afterImportingAllSources_generate = dataSourceDescription.relationshipFields;
            if (typeof afterImportingAllSources_generate !== 'undefined') {

                const batch = new Batch();
                batch.concurrency(1);

                afterImportingAllSources_generate.forEach(function (afterImportingAllSources_generate_description) {
                    batch.push(function (done) {
                        if (afterImportingAllSources_generate_description.relationship) {

                            const by = afterImportingAllSources_generate_description.by;
                            const rowObjectsOfRelationship_mongooseContext = processed_row_objects.Lazy_Shared_ProcessedRowObject_MongooseContext(by.joinDataset);
                            const rowObjectsOfRelationship_mongooseModel = rowObjectsOfRelationship_mongooseContext.Model;
                            const field = afterImportingAllSources_generate_description.field;
                            const isSingular = afterImportingAllSources_generate_description.singular;
                            const valueInDocAtField = rowObject.rowParams[field];
                            const findQuery = {};

                            if (isSingular) {
                                findQuery._id = valueInDocAtField;
                            } else {
                                findQuery._id = { $in: valueInDocAtField };

                            }

                            relationshipField = field;
                            const fieldToAcquire = { srcDocPKey: 1, _id: 1 };
                            let needObjectTitle = true;

                            if (typeof dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames !== 'undefined' && dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames[field] &&
                                dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames[field].showField &&
                                dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames[field].showField.length > 0) {

                                needObjectTitle = false;
                                const wantedfield = dataSourceDescription.fe_objectShow_customHTMLOverrideFnsByColumnNames[field].showField;

                                for (let i = 0; i < wantedfield.length; i++) {
                                    fieldToAcquire['rowParams.' + wantedfield[i]] = 1;
                                }
                            }

                            datasource_description.findById(by.joinDataset, function (err, joinDS) {
                                if (err) {
                                    return done(err);
                                }
                                if (!joinDS) {
                                    return done(new Error('No join dataset'));
                                }

                                relationshipSource_uid = joinDS.uid;

                                if (needObjectTitle) {
                                    const objectTitle = joinDS.objectTitle;
                                    fieldToAcquire['rowParams.' + objectTitle] = 1;
                                }

                                rowObjectsOfRelationship_mongooseModel.find(findQuery).select(fieldToAcquire).exec(function (err, hydrationFetchResults) {
                                    if (err) {
                                        return done(err);
                                    }
                                    const hydrationValue = isSingular ? hydrationFetchResults[0] : hydrationFetchResults;

                                    rowObject.rowParams[field] = hydrationValue; // a doc or list of docs
                                    done();
                                });
                            });

                        } else {
                            done(); // nothing to hydrate
                        }
                    });

                });

                batch.end(done);
            } else {
                done();
            }
        });

        let user = null;
        batch.push(function (done) {
            if (req.user) {
                User.findById(req.user).populate('defaultLoginTeam').exec(function (err, doc) {
                    if (err) {
                        return done(err);
                    }
                    user = doc;
                    done();
                });
            } else {
                done();
            }
        });

        // Get source document
        let sourceDoc = null;
        batch.push(function (done) {
            raw_source_documents.Model.findOne({ primaryKey: dataSourceDescription._id }, function (err, _sourceDoc) {
                if (err) {
                    return done(err);
                }
                if (!_sourceDoc) {
                    return done(new Error('No source doc found for description: ' + dataSourceDescription._id));
                }

                sourceDoc = _sourceDoc;
                done();
            });
        });

        // get stories count
        let storiesCount = 0;
        batch.push(function (done) {

            const findQuery = {
                $and: [
                    { datasourceDescription: dataSourceDescription._id },
                    {
                        $or: [
                            { isPublic: true },
                            { isPublic: { $exists: false } },
                        ],
                    },
                ],
            };

            Story.find(findQuery).count(function (err, count) {
                if (err) {
                    return done(err);
                }
                storiesCount = count;
                done();
            });
        });

        batch.end(function (err) {
            if (err) {
                return callback(err);
            }
            // we will translate any original keys to human-readable later
            const fieldsNotToLinkAsGalleryFilter_byColName = {};
            const fe_filters_fieldsNotAvailable = dataSourceDescription.fe_filters.fieldsNotAvailable;
            const {
                fe_excludeFieldsObjDetail = {},
                fe_excludeFields = {},
            } = dataSourceDescription;

            if (typeof fe_filters_fieldsNotAvailable !== 'undefined') {
                const fe_filters_fieldsNotAvailable_length = fe_filters_fieldsNotAvailable.length;
                for (let i = 0; i < fe_filters_fieldsNotAvailable_length; i++) {
                    var key = fe_filters_fieldsNotAvailable[i];
                    fieldsNotToLinkAsGalleryFilter_byColName[key] = true;
                }
            }
            // filter out fields excluded from object detail by user
            Object.keys(rowObject.rowParams).forEach(function (field) {
                if (fe_excludeFieldsObjDetail[field] || fe_excludeFields[field]) {
                    delete rowObject.rowParams[field];
                }
            });

            // format dates
            rowObject.rowParams = func.formatCoercedFieldsFromRowObject(rowObject, dataSourceDescription);

            const assignWithTruthyValues = partialRight(assignWith, (objValue, srcValue) => srcValue || objValue);
            // Add to excluded fields values which user excluded in view settings
            dataSourceDescription.fe_excludeFields = assignWithTruthyValues(dataSourceDescription.fe_excludeFields, dataSourceDescription.fe_excludeFieldsObjDetail);

            let colNames_sansObjectTitle = importedDataPreparation.HumanReadableFEVisibleColumns(dataSourceDescription);
            // ^ to finalize:
            const humanReadableObjectTitle = dataSourceDescription.objectTitle;
            const objectSubtitle = dataSourceDescription.objectSubtitle;
            const humanReadableImageField = dataSourceDescription.fe_image.field;

            colNames_sansObjectTitle = colNames_sansObjectTitle.filter(({ originalName }) =>
                ![humanReadableObjectTitle, humanReadableImageField, objectSubtitle].includes(originalName));
            let nestedColumnNames = [];
            let nestedColumnValues = [];
            let nestedObjectTitles = [];
            let newObjectSet = true;
            let temporaryNestedColumnNames = [];
            let temporaryNestedColumnValues = [];
            let titlesLength = 0;
            let indexToPush = 0;

            function formatJSONForDisplay(object, newObjectSet) {
                nestedColumnNames = [];
                nestedColumnValues = [];
                nestedObjectTitles = [];
                temporaryNestedColumnNames = [];
                temporaryNestedColumnValues = [];
                const separatedNestedArrays = traverseThroughObject(object, newObjectSet);
                separatedNestedArrays[1].push(temporaryNestedColumnNames);
                separatedNestedArrays[2].push(temporaryNestedColumnValues);
                return separatedNestedArrays;
            }

            function nestArray(key, object, newObjectSet) {
                if (newObjectSet) {
                    //length of nested should never be longer than the length of titles
                    //push + clear
                    if (temporaryNestedColumnNames.length > 0 && titlesLength > nestedColumnNames.length) {
                        nestedColumnNames.push(temporaryNestedColumnNames);
                        nestedColumnValues.push(temporaryNestedColumnValues);
                        temporaryNestedColumnValues = [];
                        temporaryNestedColumnNames = [];
                        temporaryNestedColumnValues.push([object[key]]);
                        temporaryNestedColumnNames.push([key]);
                    } else if (temporaryNestedColumnNames.length > 0) {
                        temporaryNestedColumnValues.push([object[key]]);
                        temporaryNestedColumnNames.push([key]);
                    } else {
                        temporaryNestedColumnValues.push([object[key]]);
                        temporaryNestedColumnNames.push([key]);
                    }
                } else {
                    if (temporaryNestedColumnNames.length > 0 && Array.isArray(temporaryNestedColumnNames[0])) {
                        indexToPush = temporaryNestedColumnNames.length - 1;
                        temporaryNestedColumnValues[indexToPush].push(object[key]);
                        temporaryNestedColumnNames[indexToPush].push(key);
                    } else {
                        temporaryNestedColumnValues.push(object[key]);
                        temporaryNestedColumnNames.push(key);
                    }
                }
            }

            //gets set to true whenever it's an object for the first time

            //recursively check for nested objects
            function traverseThroughObject(object, newObjectSet) {
                if (!newObjectSet) {
                    newObjectSet = false;
                }
                for (let key in object) {
                    if (isNotNestedObject(key, object)) {
                        nestArray(key, object, newObjectSet);
                        if (newObjectSet) {
                            newObjectSet = false;
                        }
                    } else {
                        nestedObjectTitles.push(key);
                        titlesLength++;
                    }
                }
                return [nestedObjectTitles, nestedColumnNames, nestedColumnValues];
            }

            function isNotNestedObject(key, object) {
                if (Array.isArray(object[key])) {
                    //if the array is the value of a key in the object we need to send back only the part of the object
                    // that has key:array otherwise there are duplicates
                    const arrayObject = {};
                    arrayObject[key] = object[key];
                    // we also need to check if the array is an array of objects ex {locations: [{state: WA}, {state:
                    // MN}, {state: CA}]}
                    if (typeof (object[key][0]) === 'object') {
                        newObjectSet = true;
                        for (let i = 0; i < object[key].length; i++) {
                            const nestedObject = object[key][i];
                            traverseThroughObject(nestedObject, newObjectSet);
                        }
                        return false;
                    } else {
                        return true;
                    }
                } else if (typeof (object[key]) === 'object') {
                    newObjectSet = true;
                    const nestedObject = object[key];
                    traverseThroughObject(nestedObject, newObjectSet);
                    return false;
                } else {
                    return true;
                }
            }

            const collatedJoinData = {};
            const collateJoinData = function (columnName) {
                const relationshipData = rowObject.rowParams[columnName];
                for (let i = 0; i < relationshipData.length; i++) {
                    const fieldId = relationshipData[i]._id;
                    for (let fieldName in relationshipData[i].rowParams) {
                        const fieldData = relationshipData[i].rowParams[fieldName];
                        if (!collatedJoinData.hasOwnProperty(fieldName)) {
                            collatedJoinData[fieldName] = [];
                        }
                        collatedJoinData[fieldName].push([fieldData, fieldId]);
                    }
                }
                return collatedJoinData;
            };

            const buildObjectLink = function (columnName, value, id) {

                return relationshipSource_uid + '/' + id;
            };

            let default_filterJSON;
            if (typeof dataSourceDescription.fe_filters.default !== 'undefined') {
                const filters = dataSourceDescription.fe_filters.default || {};

                if (!_.isEmpty(filters)) {
                    default_filterJSON = '?' + queryString.stringify(filters);
                }
            }

            let splitSubdomain;

            if (process.env.NODE_ENV === 'enterprise') {
                splitSubdomain = source_pKey;
            } else {
                const i = source_pKey.indexOf(':');
                splitSubdomain = source_pKey.substring(i + 1, source_pKey.length);
            }

            const hasOriginalImage = !!((dataSourceDescription.fe_image && dataSourceDescription.fe_image.field && dataSourceDescription.fe_image.detailView));

            // Substitute oEmbed URLs in each row object
            const oEmbedBatch = new Batch();
            oEmbedBatch.concurrency(1);

            Object.keys(rowObject.rowParams).forEach(function (field) {
                // Only replace oEmbeds on string fields and non-filterable fields
                if (
                    dataSourceDescription.raw_rowObjects_coercionScheme[field] &&
                    dataSourceDescription.raw_rowObjects_coercionScheme[field].operation === 'ToString' &&
                    fe_filters_fieldsNotAvailable.includes(field) &&
                    !fe_excludeFields[field]
                ) {
                    // Create a batch for each field
                    oEmbedBatch.push(function (done) {
                        matchAndReplaceOEmbedsInField(rowObject, field, done);
                    });
                }
            });

            oEmbedBatch.end(function (err) {
                if (err) {
                    winston.warn(err);
                    return callback(err);
                }

                const search = defaultTo(req.search, {});
                const sortBy = defaultTo(req.sortBy, {});
                const filter = defaultTo(req.filter, {});
                const data = {
                    s3Bucket: process.env.DO_S3_BUCKET,
                    s3Domain: process.env.DO_S3_ENDPOINT,
                    user: user,
                    dataTypesConversion: dataSourceDescription.raw_rowObjects_coercionScheme,
                    datasetId: dataSourceDescription._id,
                    arrayTitle: dataSourceDescription.title,
                    arrayTitleEscaped: encodeURIComponent(dataSourceDescription.title),
                    array_source_key: splitSubdomain,
                    team: dataSourceDescription._team ? dataSourceDescription._team : null,
                    brandColor: dataSourceDescription.brandColor,
                    brandWhiteText: func.useLightBrandText(dataSourceDescription.brandColor.accent),
                    default_filterJSON: default_filterJSON,
                    defaultFilterObj: dataSourceDescription.fe_filters.default || {},
                    description: dataSourceDescription.description ? dataSourceDescription.description : '',
                    view_visibility: get(dataSourceDescription, 'fe_views.views', {}),
                    isPublic: dataSourceDescription.isPublic,
                    rowObject: rowObject,
                    fieldKey_objectTitle: dataSourceDescription.objectTitle,
                    fieldKey_objectSubtitle: dataSourceDescription.objectSubtitle || '',
                    hasOriginalImage: hasOriginalImage,
                    fieldKey_originalImageURL: (dataSourceDescription.fe_image && dataSourceDescription.fe_image.field) ? dataSourceDescription.fe_image.field : null,
                    scrapedImages: hasOriginalImage ? dataSourceDescription.fe_image.scraped : null,
                    ordered_colNames_sansObjectTitleAndImages: colNames_sansObjectTitle,
                    fieldsNotToLinkAsGalleryFilter_byColName: fieldsNotToLinkAsGalleryFilter_byColName,
                    fe_galleryItem_htmlForIconFromRowObjWhenMissingImage: galleryItem_htmlWhenMissingImage ? galleryItem_htmlWhenMissingImage(rowObject) : null,
                    collateJoinData: collateJoinData,
                    formatJSONForDisplay: formatJSONForDisplay,
                    relationshipField: relationshipField,
                    buildObjectLink: buildObjectLink,
                    uid: dataSourceDescription.uid,
                    defaultView: config.formatDefaultView(get(dataSourceDescription, 'fe_views.default_view', null)),
                    isPreview: askForPreview || undefined,
                    has_google_analytics: has_google_analytics,
                    google_analytics_id: google_analytics_id,
                    header_script: dataSourceDescription._team.header_script,
                    footer_script: dataSourceDescription._team.footer_script,
                    routePath_base: routePath_base,
                    sharedPage: sharedPage,
                    banner: dataSourceDescription.banner,
                    revision: revision > 1 ? revision : undefined,
                    storiesCount: storiesCount,
                    sourceDoc: sourceDoc,
                    format: dataSourceDescription.format,
                    openDownload: dataSourceDescription.openDownload,
                    embedded: req.query.embed,
                    referer: req.headers.referer,
                    objectIndex: req.objectIndex,
                    objectDetailsPagination: req.objectDetailsPagination,
                    searchQ: search.searchQ,
                    searchCol: search.searchCol,
                    sortDirection: sortBy.sortDirection,
                    sortBy: sortBy.sortBy,
                    filterObj: filter.filterObj,
                    viewType: req.viewType,
                    timeValue: req.query.timeValue,
                    globalLibraries: [
                        ...libraries.JAVASCRIPT,
                    ],
                };
                callback(null, data);
            });
        });

    });
};
