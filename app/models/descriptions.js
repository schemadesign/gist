const integerValidator = require('mongoose-integer');
require('./teams'); // Do not remove, it should be proceed at first.
const winston = require('winston');
const _ = require('lodash');
const async = require('async');

const mongoose_client = require('./mongoose_client');
const imported_data_preparation = require('../libs/datasources/imported_data_preparation');
const User = require('../models/users');
const Team = require('../models/teams');

const raw_source_documents = require('../models/raw_source_documents');
const cached_values = require('../models/cached_values');
const { userRoles } = require('../controllers/client/config');

const { mongoose } = mongoose_client;
const { Schema } = mongoose;

const DatasourceDescription_scheme = Schema({

    uid: String,
    importRevision: { type: Number, integer: true, default: 1 },
    schema_id: { type: Schema.Types.ObjectId, ref: 'DatasourceDescription' },

    master_id: { type: Schema.Types.ObjectId, ref: 'DatasourceDescription' },
    replaced_id: { type: Schema.Types.ObjectId, ref: 'DatasourceDescription' },
    previous_datasets: [{ type: Schema.Types.ObjectId, ref: 'DatasourceDescription' }],

    banner: String,
    format: String, //csv, tsv, json
    connection: Object, //database connection
    apiEndPoint: String, //url string

    title: String,
    brandColor: {
        accent: { type: String, default: '#005CB5' },
    },
    urls: { type: Array, default: [] },
    description: String,
    fe_visible: { type: Boolean, default: true },
    fe_listed: { type: Boolean, default: false },

    fileName: String,

    raw_rowObjects_coercionScheme: { type: Object, default: {} },
    columns: { type: Array, default: [] },
    fe_excludeFields: { type: Object, default: {} },
    fe_excludeFieldsObjDetail: { type: Object, default: {} },

    fe_displayTitleOverrides: { type: Object, default: {} },

    objectTitle: String,
    objectSubtitle: String,

    fe_image: {
        field: { type: String, default: '' },
        overwrite: { type: Boolean, default: false },
        scraped: { type: Boolean, default: false },
        selector: String, //optional,
        gallery: { type: Boolean, default: true },
        timeline: { type: Boolean, default: true },
        detailView: { type: Boolean, default: true },
    },

    fe_fieldDisplayOrder: Array,
    fe_filters: {
        excludeFields: Array,
        fieldsSortableByInteger: Array,
        fieldsSortableInReverseOrder: Array,
        fieldsCommaSeparatedAsIndividual: Array,
        fieldsMultiSelectable: Array,
        fieldsAsRangeSlider: Array,
        fieldsNotAvailable: Array,
        keywords: Array,
        oneToOneOverrideWithValuesByTitleByFieldName: Object,
        valuesToExcludeByOriginalKey: { type: Object, default: { _all: [] } },
        //user created filters not automatically present in the data
        // best example is Has Image - (view in MoMA, Fish Species, Bird Species)
        fabricated: { type: Array, default: [] },
        // filters added automatically when viewing viz
        default: { type: Object, default: {} },
    },

    _otherSources: [{ type: Schema.Types.ObjectId, ref: 'DatasourceDescription' }],
    customFieldsToProcess: { type: Array, default: [] },
    relationshipFields: { type: Array, default: [] },
    createdFields: { type: Array, default: [] },

    fe_views: {
        default_view: String,
        views: { type: Object, default: {} },
    },

    _team: { type: Schema.Types.ObjectId, ref: 'Team' },

    isPublic: { type: Boolean, default: true },
    sample: { type: Boolean, default: false },

    fe_objectShow_customHTMLOverrideFnsByColumnNames: Object,

    fe_nestedObject: {
        prefix: String,
        fields: Array,
        fieldOverrides: Object,
        valueOverrides: Object,
        criteria: {
            fieldName: String,
            operatorName: String, // "equal"
            value: String, // ""
        },
        nestingKey: String,
    },
    fe_viewOptions: {
        filtersRail: { type: Boolean, default: true },
        search: { type: Boolean, default: true },
        viewControls: { type: Boolean, default: true },
        viewInteractivity: { type: Boolean, default: true },
        enableAccessibility: { type: Boolean, default: false },
        insightsExplorer: { type: Boolean, default: true },
        insightsExplorerEmbed: { type: Boolean, default: true },
        enableLastUpdated: { type: Boolean, default: false },
        fullscreenExpand: { type: Boolean, default: true },
    },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastImportInitiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    imported: { type: Boolean, default: false },
    replacement: { type: Boolean, default: false },
    // child_replacement: {type: Boolean, default: false},
    replaced: { type: Boolean, default: false },

    firstImport: { type: Number, integer: true, default: 1, min: 0, max: 6 },
    // 0: false, not first import
    // 1: Source tab
    // 2: Fields tab
    // 3: Content tab
    // 4: Filters tab
    // 5: Views tab
    // 6: Display tab

    tabDestination: { type: Number, integer: true, default: 0 },
    // values mirror firstImport, used for tab destination when processing from different tabs

    dirty: { type: Number, integer: true, default: 0, min: 0, max: 4 },
    //0: nth to do, imported
    //1: reimport from beginning
    //2: starting from import processed
    //3: post import caching
    //4: only image scraping

    skipImageScraping: { type: Boolean, default: false },

    jobId: { type: Number, integer: true, default: 0 },
    //0: no job has started, job has completed
    //all others: related to the jobId in the queue

    // for json uploads/imports
    JSONPath: { type: String, default: '*' },

    state: { type: String, enum: ['pending', 'approved', 'disapproved'] },
    //pending
    //approved
    //disapproved, maybe notify the user about this

    includeEmptyFields: { type: Boolean, default: true },
    lastImportTriggeredBy: { type: String, enum: ['manual', 'automated'] },
    // 'manual', 'automated',
    lastImportErrorLog: String,
    metaData: Object,
    clones: { type: Number, integer: true, default: 0 },
    ancillaryFile: String,
    colorMapping: Object,
    // vizType maps to acl
    vizType: String,
    // keep track of whether or not the content has been changed within content editor.
    // display 'are you sure you want to proceed with process' modal if true
    // reset to false anytime processing takes place
    contentEdited: { type: Boolean, default: false },
    openDownload: { type: Boolean, default: false },
    updatedContent: {
        created: { type: Object, default: {} },
        edited: { type: Object, default: {} },
        publishedStatus: { type: Object, default: {} },
        new: { type: Boolean, default: true },
    },
    preserveEditedData: { type: Boolean, default: true },
    smartsheet: Object,
    pipedrive: String,
    datadotworld: Object,
    socrata: Object,
    salesforce: Object,
}, { timestamps: true, minimize: false });

const deepPopulate = require('mongoose-deep-populate')(mongoose);
DatasourceDescription_scheme.plugin(integerValidator);
DatasourceDescription_scheme.plugin(deepPopulate, {
    whitelist: ['_otherSources', '_otherSources._team', 'schema_id', '_team', 'schema_id._team',
        'author', 'lastImportInitiatedBy', 'schema_id.lastImportInitiatedBy', 'schema_id.lastImportInitiatedBy._team', 'previous_datasets', 'previous_datasets.author'],
});

DatasourceDescription_scheme.pre('save', function (next) {
    this._wasNew = this.isNew;
    next();
});

DatasourceDescription_scheme.post('save', function (doc) {
    if (doc._wasNew && !doc.master_id) {
        this.populate('author _team', function (err, docPopulatedWithAuthor) {
            if (!docPopulatedWithAuthor.schema_id) {
                if (err || !docPopulatedWithAuthor.author) {
                    winston.error('Viz created with error err:' + err);
                }
            }
        });
    }
});

DatasourceDescription_scheme.pre('remove', function (next) {
    const thisId = this._id;

    // fixme: shouldn't it be this.schema_id?
    if (thisId.schema_id) {
        next();
    } else {
        async.parallel([
            function (callback) {
                mongoose_client.dropCollection(`rawrowobjects-${thisId}`, function (err) {
                    // Consider that the collection might not exist since it's in the importing process.
                    if (err && err.code !== 26) {
                        return callback(`dropCollection rawrowobjects-${thisId} err: ${err}`);
                    }
                    winston.info(`Removed raw row object: ${thisId}`);
                    callback();
                });
            },
            function (callback) {
                mongoose_client.dropCollection(`rawrowobjects-${thisId}-automated`, function (err) {
                    // Consider that the collection might not exist since it's in the importing process.
                    if (err && err.code !== 26) {
                        return callback(`dropCollection rawrowobjects-${thisId}-automated err: ${err}`);
                    }
                    winston.info(`Removed automated raw row object: ${thisId}`);
                    callback();
                });
            },
            function (callback) {
                mongoose_client.dropCollection(`processedrowobjects-${thisId}`, function (err) {
                    // Consider that the collection might not exist since it's in the importing process.
                    if (err && err.code !== 26) {
                        return callback(`dropCollection processedrowobjects-${thisId} err: ${err}`);
                    }
                    winston.info(`Removed processed row object: ${thisId}`);
                    callback();
                });
            },
            function (callback) {
                mongoose_client.dropCollection(`processedrowobjects-${thisId}-automated`, function (err) {
                    // Consider that the collection might not exist since it's in the importing process.
                    if (err && err.code !== 26) {
                        return callback(`dropCollection processedrowobjects-${thisId}-automated err: ${err}`);
                    }
                    winston.info(`Removed automated processed row object: ${thisId}`);
                    callback();
                });
            },
            function (callback) {

                raw_source_documents.Model.remove({ primaryKey: thisId }, function (err) {
                    if (err) {
                        return callback(`raw_source_documents.remove err: ${err}`);
                    }
                    winston.info(`Removed raw source document: ${thisId}`);
                    callback();
                });
            },
            function (callback) {
                cached_values.remove({ srcDocPKey: thisId }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    winston.info(`Removed cached unique values: ${thisId}`);
                    callback();
                });
            },
        ], function (err) {
            if (err) {
                winston.error(err);
            }
            next(err);
        });
    }
});

DatasourceDescription_scheme.statics.findByUidAndTeamSubdomain = async function (uid, subdomain, project = { isPublic: 1 }) {
    const team = await Team.findOne({ subdomain });

    return await this.findOne({
        uid,
        $or: [
            { replaced: false },
            { replaced: { $exists: false } },
        ],
        _team: team._id,
    }, project);
};

DatasourceDescription_scheme.methods.canBeDownloadedBy = function (userId) {
    if (!userId || this.openDownload) {
        return Promise.resolve(this.openDownload);
    }

    return User.findById(userId).then(user => {
        if (!user) {
            return false;
        }

        const isSuperAdmin = user.isSuperAdmin();
        const isAdmin = user.isAdmin(this._team);
        const isTeamMember = user._team.some(team => team.equals(this._team._id));
        const isViewer = user._viewers.some(objId => objId.equals(this._id));
        const isEditor = user._editors.some(objId => objId.equals(this._id));

        return isSuperAdmin || isAdmin || (isTeamMember && (isViewer || isEditor));
    });
};

const buildBaseQuery = (title) => {
    const currentDatasetQuery = {
        $or: [
            { replaced: false },
            { replaced: { $exists: false } },
        ],
    };
    const importedOrConnectedDatasetQuery = {
        $or: [
            { imported: true },
            { connection: { $ne: null } },
        ],
    };
    const datasetQuery = {
        fe_visible: true,
        fe_listed: true,
        firstImport: 0,
        $and: [
            currentDatasetQuery,
            importedOrConnectedDatasetQuery,
        ],
    };

    if (title) {
        datasetQuery.title = title;
    }

    return datasetQuery;
};

DatasourceDescription_scheme.statics.buildTeamPageQuery = (user, title) => {
    const baseQuery = buildBaseQuery(title);

    if (!user) {
        return {
            ...baseQuery,
            isPublic: true,
        };
    }

    if (user.isSuperAdmin()) {
        return baseQuery;
    }

    const userId = user._id.toString();

    baseQuery.$and.push({
        $or: [
            {
                _team: {
                    $in: user._team
                        .filter(team => team.admin.some(id => id.toString() === userId))
                        .map(team => team._id),
                },
            },
            { _id: { $in: user._editors } },
            { _id: { $in: user._viewers } },
            { isPublic: true },
        ],
    });

    return baseQuery;
};

DatasourceDescription_scheme.statics.getShowcasedEntries = async function (title, teamName) {
    const datasetQuery = {
        ...buildBaseQuery(title),
        isPublic: true,
    };

    const populateQuery = [
        {
            path: '_team',
            match: {},
            select: 'subdomain admin _id title isEnterprise',
        },
        {
            path: 'previous_datasets',
            select: 'createdAt -_id',
        },
    ];

    if (teamName) {
        populateQuery.match.title = teamName;
    }

    if (process.env.NODE_ENV !== 'enterprise') {
        datasetQuery.state = 'approved';
    }

    const datasets = await this.find(datasetQuery)
        .populate(populateQuery);

    return datasets.filter(dataset => !_.isNull(dataset._team));
};

var datasource_description = mongoose.model('DatasourceDescription', DatasourceDescription_scheme, 'datasourcedescriptions');

// Customize the model
function getDescriptionsAndPopulateTeam(teamQuery, datasetQuery, callback) {

    datasource_description.find(datasetQuery)
        .populate({
            path: '_team',
            match: teamQuery,
            select: 'subdomain admin _id title isEnterprise',
        })
        .sort({ createdAt: 'desc' })
        .exec(callback);
}

var _GetAllDescriptions = function (req, callback) {

    var userId = req.user;

    function nonLoginUserQuery(cb) {
        var publicAndImportedDataset = {
            isPublic: true,
            imported: true,
            fe_listed: true,
            fe_visible: true,
            state: 'approved',
        };
        var publicAndConnectedDataset = {
            isPublic: true,
            connection: { $ne: null },
            fe_listed: true,
            fe_visible: true,
        };
        var currentDataset = { $or: [{ replaced: false }, { replaced: { $exists: false } }] };

        if (req.query.vizName) {
            publicAndImportedDataset.title = req.query.vizName;
        }

        if (req.query.teamName) {
            getDescriptionsAndPopulateTeam({
                title: req.query.teamName,
            },
            { $and: [{ $or: [publicAndImportedDataset, publicAndConnectedDataset] }, currentDataset] }, cb);
        } else {
            getDescriptionsAndPopulateTeam(
                { $and: [{ $or: [publicAndImportedDataset, publicAndConnectedDataset] }, currentDataset] }, cb);
        }
    }

    if (userId) {
        User.findById(userId)
            .populate('_team')
            .populate('defaultLoginTeam')
            .exec(function (err, foundUser) {
                if (err) {
                    return callback(err);
                }
                if (!foundUser) {
                    return nonLoginUserQuery(callback);
                }
                var importedDataset = { imported: true, fe_visible: true, state: 'approved' };

                if (req.query.vizName) {
                    importedDataset.title = req.query.vizName;
                }

                var connectedDataset = { connection: { $ne: null }, fe_listed: true, fe_visible: true };
                if (process.env.NODE_ENV === 'enterprise') {
                    delete importedDataset.state;
                }

                var myTeamId;
                var otherTeams;
                var myTeam;

                if (foundUser.isSuperAdmin()) {
                    // get descriptions and populate dataset with query/teams
                    getDescriptionsAndPopulateTeam({}, { $or: [importedDataset, connectedDataset] }, callback);
                } else if (foundUser.defaultLoginTeam.admin.some(id => id.toString() === userId)) {
                    myTeamId = foundUser.defaultLoginTeam._id;
                    otherTeams = { _team: { $ne: myTeamId }, isPublic: true };
                    myTeam = { _team: foundUser.defaultLoginTeam._id };

                    // get descriptions and populate dataset with query/teams
                    getDescriptionsAndPopulateTeam(
                        {
                            $and: [
                                { $or: [myTeam, otherTeams] },
                                { $or: [importedDataset, connectedDataset] },
                            ],
                        },
                        callback);

                } else {
                    myTeamId = foundUser.defaultLoginTeam._id;
                    otherTeams = { _team: { $ne: myTeamId }, isPublic: true };
                    myTeam = {
                        _team: foundUser.defaultLoginTeam._id,
                        $or: [{ _id: { $in: foundUser._editors } }, { _id: { $in: foundUser._viewers } }],
                    };

                    // get descriptions populate
                    getDescriptionsAndPopulateTeam(
                        {
                            $and: [
                                { $or: [myTeam, otherTeams] },
                                { $or: [importedDataset, connectedDataset] },
                            ],
                        },
                        callback);
                }
            });
    } else {
        nonLoginUserQuery(callback);
    }
};
datasource_description.GetAllDescriptions = _GetAllDescriptions;

/* -----------   helper function ----------- */

var _mergeObject = function (obj1, obj2) {
    var obj3 = {};
    var attrname;
    for (attrname in obj1) {
        obj3[attrname] = obj1[attrname];
    }
    for (attrname in obj2) {
        obj3[attrname] = obj2[attrname];
    }
    return obj3;
};

var consolidateDescriptions = function (description) {
    var desc = _.omit(description, ['schema_id']);
    var schemaDesc = description.schema_id;
    desc.schemaId = schemaDesc._id;
    for (var attrname in schemaDesc) {
        if (attrname !== 'connection') {

            if (desc[attrname]) {
                if (Array.isArray(desc[attrname])) {
                    desc[attrname] = schemaDesc[attrname].concat(desc[attrname]);
                } else if (typeof desc[attrname] === 'string') {
                    desc[attrname] = schemaDesc[attrname];
                } else if (typeof desc[attrname] === 'object') {
                    desc[attrname] = _mergeObject(schemaDesc[attrname], desc[attrname]);
                }
            } else if (attrname !== 'replaced' && attrname !== 'replacement') {
                desc[attrname] = schemaDesc[attrname];
            }
        }

    }

    return desc;
};

datasource_description.consolidateDescriptions = consolidateDescriptions;

/* -------   end helper function ------------  */

var _datasetsNeedToReimport = function (currentSourceId, next) {

    datasource_description.find({ _otherSources: currentSourceId }, function (err, relatedSources) {
        if (err) {
            return next(err);
        }
        if (!relatedSources) {
            return next(null, { datasets: [] });
        }
        const datasetsNeedToReimport = [];
        relatedSources.forEach((src) => {
            if (src.relationshipFields) {
                for (let i = 0; i < src.relationshipFields.length; i++) {
                    if (src.relationshipFields[i].relationship == true &&
                        src.relationshipFields[i].by.joinDataset == currentSourceId) {
                        datasetsNeedToReimport.push(src);
                    }
                }
            }
        });
        next(null, { datasets: datasetsNeedToReimport });
    });
};
datasource_description.datasetsNeedToReimport = _datasetsNeedToReimport;

const _GetDescriptionsToSetupByIds = function (Ids, fn) {
    const descriptions = [];
    const self = this;

    function asyncFunction(id, cb) {
        self.findOne({ $or: [{ _id: id }, { schema_id: id }] })
            .lean()
            .deepPopulate('_otherSources schema_id _team _otherSources._team schema_id._team', {
                populate: {
                    _otherSources: {
                        match: { imported: false },
                    },
                },
            })
            .exec(function (err, description) {
                if (err) {
                    winston.error('Error occurred when finding datasource description: ', err);
                    cb(err);
                } else {
                    if (description._otherSources && description._otherSources.length > 0) {
                        descriptions.push(_.omit(description, ['_otherSources']));
                        _.map(description._otherSources, function (src) {
                            descriptions.push(_.omit(src, ['_otherSources']));
                        });
                        cb();
                    } else if (!description.schema_id) {
                        descriptions.push(description);
                        cb();
                    } else {
                        descriptions.push(consolidateDescriptions(description));
                        cb();
                    }
                }
            });
    }

    const requests = Ids.map(function (Id) {
        return new Promise(function (resolve) {
            asyncFunction(Id, resolve);
        });
    });
    Promise.all(requests).then(function () {
        fn(descriptions);
    });
};
datasource_description.GetDescriptionsToSetup = _GetDescriptionsToSetupByIds;

const _GetDescriptionsWith_subdomain_uid_importRevision = function (preview, subdomain, uid, revision, fn) {
    const subdomainQuery = {};
    const self = this;
    const findQuery = {
        uid,
    };
    const sortQuery = {};

    if (subdomain !== null) {
        subdomainQuery.subdomain = subdomain;
    }

    if (revision) {
        findQuery.importRevision = _.toNumber(revision);
    } else {
        // default to latest revision
        sortQuery.importRevision = -1;
    }

    self.find(findQuery)
        .populate({
            path: '_team',
            match: subdomainQuery,
        })
        .lean()
        .sort(sortQuery)
        .exec(function (err, descriptions) {
            if (err) {
                winston.error('Error occurred when finding datasource description master datsource description for preview ', err);
                return fn(err);
            }

            // no error and no descriptions
            if (!descriptions) {
                return fn();
            }

            // Queried descriptions from other teams will have a null _team
            descriptions = descriptions.filter(function (description) {
                return description._team !== null;
            });

            // no error and no descriptions
            if (!descriptions.length) {
                return fn();
            }

            const [matchedDescription] = descriptions;

            if (!preview) {
                return fn(null, matchedDescription);
            }

            self.find({ master_id: matchedDescription._id }, function (err, previewCopy) {
                if (err) {
                    winston.error('Error occurred when finding datasource description master datsource description for preview ', err);
                    return fn(err);
                }

                if (previewCopy.length > 0) {
                    matchedDescription.fe_views = previewCopy[0].fe_views;
                    matchedDescription.fe_excludeFieldsObjDetail = previewCopy[0].fe_excludeFieldsObjDetail;
                    matchedDescription.objectTitle = previewCopy[0].objectTitle;
                    matchedDescription.fe_image = previewCopy[0].fe_image;
                    matchedDescription.colorMapping = previewCopy[0].colorMapping;
                }
                fn(null, matchedDescription);
            });
        });
};

datasource_description.GetDescriptionsWith_subdomain_uid_importRevision = _GetDescriptionsWith_subdomain_uid_importRevision;

function _GetDatasourceByUserAndKey(userId, sourceKey, revision, overrideAuth, fn) {
    imported_data_preparation.DataSourceDescriptionWithPKey(false, sourceKey, revision)
        .then(function (datasourceDescription) {
            let error;
            if (!datasourceDescription) {
                error = new Error('no datasource description found for sourceKey: ' + sourceKey);
                error.status = 404;
                return fn(error);
            }
            if (!datasourceDescription._team) {
                error = new Error('no team found for description: ' + datasourceDescription._id);
                error.status = 404;
                return fn(error);
            }

            if (process.env.NODE_ENV !== 'enterprise' && (!datasourceDescription.fe_visible || !datasourceDescription.imported) && !datasourceDescription.connection) {
                return fn();
            }

            if (userId) {
                User.findById(userId)
                    .populate('_team')
                    .exec(function (err, foundUser) {
                        if (err) {
                            return fn(err);
                        }
                        if (!foundUser) {
                            if (datasourceDescription.isPublic) {
                                return fn(null, datasourceDescription);
                            }
                        } else {
                            const userId = foundUser._id.toString();

                            if (foundUser.isSuperAdmin() ||
                                foundUser.role === userRoles.visualizationEditor ||
                                (
                                    (datasourceDescription._team.admin.some(id => id.toString() === userId)) ||
                                    datasourceDescription.author.equals(foundUser._id) ||
                                    foundUser._editors.indexOf(datasourceDescription._id) >= 0 ||
                                    foundUser._viewers.indexOf(datasourceDescription._id) >= 0 ||
                                    datasourceDescription.isPublic
                                )
                            ) {
                                return fn(null, datasourceDescription);
                            } else {
                                return fn('unauthorized');
                            }
                        }
                    });
            } else {
                if (overrideAuth) {
                    return fn(null, datasourceDescription);
                }
                if (datasourceDescription.isPublic) {
                    return fn(null, datasourceDescription);
                }
                fn();
            }
        })
        .catch(function (err) {
            if (err) {
                winston.error('cannot bind Data to the view, error: ', err);
            }
            fn(err);
        });
}

datasource_description.GetDatasourceByUserAndKey = _GetDatasourceByUserAndKey;

/**
 * find dataset by id and populate/deep populate where applicable
 * if no dataset, return 404 error
 */
var _findByIdAndPopulateFields = function (args, callback) {
    const { id, populate = [], returnMongoObject } = args;
    const populateString = populate.length > 0 ? populate.join(' ') : '';

    datasource_description.findById(id)
        .deepPopulate(populateString)
        .lean(!returnMongoObject)
        .exec(function (err, description) {
            if (err) {
                err.status = 500;
                return callback(err);
            }

            if (!description) {
                winston.error('error finding and populating fields: no description found');
                err = new Error('Description not found');
                err.status = 404;
                return callback(err);
            }

            callback(null, description);
        });
};
datasource_description.findByIdAndPopulateFields = _findByIdAndPopulateFields;

module.exports = datasource_description;
