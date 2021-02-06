const winston = require('winston');
const async = require('async');
const fs = require('fs');
const request = require('request');
const path = require('path');
const _ = require('lodash');
const kue = require('kue');

const mongoose_client = require('../../../models/mongoose_client');
const datasource_description = require('../../../models/descriptions');
const Team = require('../../../models/teams');
const User = require('../../../models/users');
const Story = require('../../../models/stories');
const datasource_file_service = require('../../../libs/utils/aws-datasource-files-hosting');
const imported_data_preparation = require('../../../libs/datasources/imported_data_preparation');
const s3ImageHosting = require('../../../libs/utils/aws-image-hosting');
const reimport = require('./reimport');
const nested = require('./nested');
const processing = require('../../../libs/datasources/processing');
const download = require('./download');
const uploadHelpers = require('./upload-helpers');
const saveHelpers = require('./save-helpers');
const getHelpers = require('./get-helpers');
const queueHelpers = require('./index-queue');
const deleteHelpers = require('./delete-helpers');
const keywordsHelpers = require('./keywords-helpers');
const miscHelpers = require('./misc-helpers');
const indexHelpers = require('./index-helpers');
const mandatorySettings = require('./mandatory-settings-helpers');
const queueWorkerHelpers = require('../../../libs/import/queue-worker-helpers');
const { validateObjectId } = require('../../../utils/validation');
const { handleError } = require('../../../utils/requests');
const { PublicError } = require('../../../libs/system/errors');
const { hasValidDatasetSource } = require('../../../utils/datasets');
const { setSafeColorMapping } = require('../../client/colorPalette');

const ALLOWED_FILE_TYPES = /image\/bmp|image\/gif|image\/jpeg|image\/png|image\/svg\+xml|image\/svg xml/gm;

const { mongoose } = mongoose_client;
const { Types } = mongoose;

module.exports = {
    startJob,
};

module.exports.getDependencyDatasetsForReimporting = (req, res) => {
    datasource_description.findById(req.params.id, (err, currentSource) => {
        if (err) {
            winston.error('An error occurred while getting datasets for reimporting.', err);
            return res.status(500).send({ error: 'An error occurred while getting datasets for reimporting.' });
        }
        if (currentSource === null) {
            return res.json({ datasets: [] });
        }

        datasource_description.datasetsNeedToReimport(req.params.id, (err, jsonObj) => {
            if (err) {
                winston.error('An error occurred while getting datasets for reimporting.', err);
                return res.status(500).send({ error: 'An error occurred while getting datasets for reimporting.' });
            }
            return res.json(jsonObj);
        });
    });
};

// flexible function for getting a set of datasets with a variable set of query parameters
module.exports.getDatasetsWithQuery = (req, res) => {
    getHelpers
        .getDatasetByQuery(req.body)
        .then(data => res.status(data.statusCode).json(data.data))
        .catch(error => res.status(error.statusCode).send(error.message));
};

module.exports.signedUrlForAssetsUpload = (req, res) => {
    if (!req.query.fileType.match(ALLOWED_FILE_TYPES)) {
        return res.status(406).send({ error: 'Invalid file format' });
    }

    const queryArgs = {
        id: req.params.id,
        populate: ['_team'],
    };
    datasource_description.findByIdAndPopulateFields(queryArgs, (err, description) => {
        if (err) {
            winston.error('An error occurred while retrieving data for signed url.', err);
            return res.status(500).send({
                error: 'An error occurred while retrieving data for signed url.',
            });
        }
        if (!description) {
            return res.status(404).json({ message: 'Description not found' });
        }
        const key = `${description._team.subdomain}/datasets/${description._id}/assets/${req.query.assetType}/${req.query.fileName}`;
        s3ImageHosting.signedUrlForPutObject(key, req.query.fileType, (err, data) => {
            if (err) {
                winston.error('An error occurred while creating a signed url.', err);
                return res.status(500).send({
                    error: 'An error occurred while creating a signed url.',
                });
            } else {
                return res.json({ putUrl: data.putSignedUrl, publicUrl: data.publicUrl });
            }
        });
    });
};

module.exports.approvalRequest = async (req, res) => {
    const datasetId = req.params.id;
    const state = req.body.state;

    if (['approved', 'disapproved'].includes(state)) {
        if (!(await User.findById(req.user)).isSuperAdmin()) {
            return res.status(500).send({
                message: `No permission to change state to ${state}`,
            });
        }
    }

    miscHelpers
        .approvalRequest(datasetId, state)
        .then(dataset => res.json(dataset))
        .catch(error => {
            winston.error('An error occurred while approving a request.', error);
            return res.status(500).send({ error: 'An error occurred while approving a request.' });
        });
};

module.exports.deleteSource = (req, res) => {
    if (!req.params.id) {
        return res.status(500).json({ err: 'Invalid parameter' });
    }
    deleteHelpers
        .deleteSource(req.params.id)
        .then(data => res.json(data))
        .catch(err => {
            winston.error('An error occurred while deleting source.', err);
            return res.status(500).json({ error: 'An error occurred while deleting source.' });
        });
};

/**
 * Remove datasource description.
 *
 * @param {*} req
 * @param {*} res
 */
module.exports.remove = (req, res) => {
    if (!req.body.id) {
        return res
            .status(500)
            .send({ error: 'An error occurred while removing datasource descrition. No id provided.' });
    }

    const tasks = [
        async.apply(deleteHelpers.findDataset, req.body.id),
        (descriptions, next) => {
            async.each(
                descriptions,
                (description, done) => {
                    Team.update(
                        { _id: description._team },
                        { $pull: { datasourceDescriptions: description._id } },
                        done
                    );
                },
                err => next(err, descriptions)
            );
        },
        (descriptions, next) => {
            async.each(
                descriptions,
                (description, done) => {
                    datasource_file_service.deleteDataset(description, done);
                },
                err => next(err, descriptions)
            );
        },
        deleteHelpers.removeDatasourceWithSchemaId,
        deleteHelpers.removeOtherSources,
        deleteHelpers.removeCronJobs,
        (descriptions, next) => {
            async.each(
                descriptions,
                (description, done) => {
                    Story.remove({ datasourceDescription: description._id }, done);
                },
                err => next(err, descriptions)
            );
        },
        (descriptions, next) => {
            async.each(
                descriptions,
                (description, done) => {
                    description.remove(done);
                },
                err => next(err, descriptions)
            );
        },
        (descriptions, next) => {
            async.each(
                descriptions,
                (description, done) => {
                    User.update(
                        { $or: [{ _editors: req.body.id }, { _viewers: req.body.id }] },
                        {
                            $pull: {
                                _editors: req.body.id,
                                _viewers: req.body.id,
                            },
                        },
                        done
                    );
                },
                err => next(err, descriptions)
            );
        },
    ];

    async.waterfall(tasks, err => {
        if (err) {
            winston.error(`Error encountered during raw objects remove ${err}`);
            return res.status(500).send({ error: 'Error encountered during raw objects remove' });
        }
        winston.debug(`Removed dataset id: ${req.body.id}`);
        return res.status(200).send('ok');
    });
};

/**
 * Reads JSON from API end-point and gets the keys.
 *
 * @param {request} req
 * @param {response} res
 */
module.exports.readSampleJSONPath = function(req, res) {
    const endPoint = req.body.url;

    request.get(endPoint, { json: true, timeout: 1000 }, (err, response, data) => {
        if (err || !data) {
            if (err) {
                winston.error('An error occurred while reading JSON file.', err);
                return res.status(500).json({ error: 'An error occurred while reading JSON file.' });
            }
        } else {
            const paths = indexHelpers.deriveKeys([], data, '');
            return res.json(paths);
        }
    });
};

/**
 * gets a datasource description associated with id
 * if it's via a connection, retrieves the info from hadoop
 * if the file is a replacement or there are no columns in the session, it sets session columns
 */
const getDatasetDefault = (req, res) => {
    const args = {
        datasetId: req.params.id,
        description: req.description,
        replacement: req.replacement,
    };

    const tasks = [
        next => {
            // handle caching
            const { description } = args;
            // The columns in db are missing, but the object has raw_rowObjects_coercionScheme, gets the columns
            // from database if the dataset is not reimported or replaced.
            if (
                description &&
                _.isEmpty(description.columns) &&
                description.raw_rowObjects_coercionScheme &&
                !args.replacement
            ) {
                indexHelpers.exportColumnsFromCoercion(description, (error, columns) => {
                    if (error) {
                        return next(error);
                    }

                    args.description.columns = columns;
                    next(null, args);
                });
            } else {
                next(null, args);
            }
        },
        async (args, next) => {
            let { description } = args;

            // interpretation:
            // if the datasource has already been created
            // if it's either an uploaded file or an api endpoint
            // if it's a replacement and there are no columns
            // if it's been updated by cron job - if there are more row objects than session columns
            if (
                description.uid &&
                hasValidDatasetSource(description) &&
                (_.isEmpty(description.columns) ||
                    args.replacement ||
                    (description.raw_rowObjects_coercionScheme &&
                        Object.keys(description.raw_rowObjects_coercionScheme).length > description.columns.length))
            ) {
                const readDatasourceFunction = getHelpers.getReadDatasourceFunction(description);

                let stream;
                try {
                    stream = await saveHelpers.getFileStream(description);
                } catch (error) {
                    return next({ errorWithData: true, description, error });
                }

                getHelpers
                    .readDatasourceAndSetColumns(readDatasourceFunction, args.replacement, description, stream)
                    .then(({ data }) => {
                        next(null, data);
                    })
                    .catch(({ data }) => {
                        if (args.replacement) {
                            next({
                                errorWithData: true,
                                error: new PublicError(
                                    'Problem during the import, perhaps the source is no longer available'
                                ),
                                description: data.description,
                            });
                        } else {
                            next({ errorWithData: true, ...data });
                        }
                    });
            } else {
                winston.debug(`Returning dataset description - id: ${description._id}`);
                next(null, { dataset: description });
            }
        },
    ];
    async.waterfall(tasks, (err, data) => {
        if (err) {
            // Revert the dirty to 0 if there was an error during the processing.
            if (err.description && err.description.apiEndPoint && err.description.dirty === 1) {
                winston.debug(
                    `Problem with reimporting from external source, reverting the state of dataset ${err.description._id}`
                );
                datasource_description.findByIdAndUpdate(
                    err.description._id,
                    {
                        $set: {
                            dirty: 0,
                            firstImport: 1,
                            tabDestination: 0,
                            JSONPath: '*',
                        },
                        $unset: { apiEndPoint: 1, format: 1 },
                    },
                    (updateError, data) => {
                        if (updateError) {
                            winston.error(`Problem when reverting state of dataset ${data.description._id} `);
                        }
                        return res.status(500).json({ error: 'Problem when reverting state of dataset.' });
                    }
                );
            } else {
                winston.error('An error occurred while reimporting external source.', err);
                const getError = err instanceof Error ? err : _.get(err, 'error');
                const publicErrorMessage =
                    getError instanceof PublicError
                        ? getError.message
                        : 'An error occurred while reimporting external source.';
                return res.status(500).json({ error: publicErrorMessage });
            }
        } else {
            return res.status(200).json(data);
        }
    });
};

/**
 * Get endpoint.
 *
 * @param {request} req
 * @param {response} res
 */
module.exports.get = function(req, res) {
    if (!req.params.id) {
        return res.status(500).json({ error: 'No ID given' });
    }

    if (!Types.ObjectId.isValid(req.params.id)) {
        return res.status(500).json({ error: 'Invalid ID' });
    }

    const args = {
        id: req.params.id,
    };

    async.waterfall(
        [async.apply(getHelpers.findDataset, args), uploadHelpers.getDatasetPermissions, getHelpers.updateColorMapping],
        function(err, args) {
            if (err) {
                winston.error('An error occurred while getting endpoint', err);
                return res.status(500).json({ error: 'An error occurred while getting endpoint' });
            }

            // merge req with the args, pass the properties "reimport", "replacement" and "description" to req.
            _.merge(req, args);

            const { description } = args;
            let getDatasetFunction;

            if (!description.permissions.includes('useStandardGet')) {
                try {
                    getDatasetFunction = require(path.join(
                        __dirname,
                        '/../../../../user/',
                        description._team.subdomain,
                        '/src/import'
                    )).getDataset;
                } catch (e) {
                    winston.warn(
                        `No get dataset function for team ${description._team.subdomain}. Add "useStandardGet" to visualization ACL`
                    );
                }
            }

            if (typeof getDatasetFunction !== 'function') {
                getDatasetFunction = getDatasetDefault;
            }

            getDatasetFunction(req, res);
        }
    );
};

module.exports.loadDatasourceColumnsForMapping = (req, res) => {
    if (!req.params.id) {
        return res.status(500).send('Invalid parameter.');
    }

    const queryArgs = {
        id: req.params.id,
        populate: ['_team'],
    };

    datasource_description.findByIdAndPopulateFields(queryArgs, (err, description) => {
        if (err) {
            return res.status(err.status).send(err);
        }

        if (description.uid && _.isEmpty(description.columns)) {
            return datasource_file_service.keyExists(description, (error, exists) => {
                if (exists) {
                    const stream = datasource_file_service.getDatasource(description).createReadStream();
                    const readDatasourceFunction = getHelpers.getReadDatasourceFunction(description);

                    readDatasourceFunction(false, description, stream, (err, columns) => {
                        if (err) {
                            winston.error('An error occurred while loading datasource columns.', err);
                            return res
                                .status(500)
                                .json({ error: 'An error occurred while loading datasource columns.' });
                        }

                        description.columns = columns;
                        description.save();

                        columns = columns.concat(
                            description.customFieldsToProcess.map(customField => {
                                return { name: customField.fieldName };
                            })
                        );

                        res.json({
                            cols: columns.filter(column => {
                                return !description.fe_excludeFields || !description.fe_excludeFields[column.name];
                            }),
                        });
                    });
                } else {
                    winston.error('An error occurred while loading datasource columns.', err);
                    return res.status(500).json({ error: 'An error occurred while loading datasource columns.' });
                }
            });
        }

        if (!_.isEmpty(description.columns)) {
            let columns = description.columns;
            columns = columns.concat(
                description.customFieldsToProcess.map(customField => {
                    return { name: customField.fieldName };
                })
            );

            return res.json({
                cols: columns.filter(e => {
                    return !description.fe_excludeFields || !description.fe_excludeFields[e.name];
                }),
            });
        }

        return res.status(500).json({ error: 'Invalid parameter' });
    });
};

const findBySchemaId = (id, callback) => {
    datasource_description
        .find({
            schema_id: id,
            $or: [{ replaced: false }, { replaced: { $exists: false } }],
        })
        .lean()
        .deepPopulate('schema_id _team schema_id._team')
        .exec((err, sources) => {
            callback(err, sources);
        });
};

const getAdditionalDatasets = (req, res) => {
    let { sources } = req;
    let sourcesToPull = [];

    async.forEachOf(
        sources,
        (source, index, callback) => {
            source._team = source.schema_id._team;
            source.schemaId = source.schema_id._id;
            source.vizType = source.schema_id.vizType;

            if (source.fileName && _.isEmpty(source.columns)) {
                datasource_file_service.keyExists(source, err => {
                    if (err) {
                        const readDatasourceFunction = getHelpers.getReadDatasourceFunction(source);

                        readDatasourceFunction(
                            false,
                            source,
                            datasource_file_service.getDatasource(source).createReadStream(),
                            async (err, columns) => {
                                if (err) {
                                    winston.error(err);
                                    return callback(err);
                                }

                                source.columns = columns;

                                const updateStatement = { $set: { columns } };

                                try {
                                    await datasource_description.findByIdAndUpdate(source._id, updateStatement, {
                                        select: {},
                                    });
                                } catch (e) {
                                    return callback(e);
                                }

                                callback();
                            }
                        );
                    } else {
                        sourcesToPull.push(source._id);
                        callback();
                    }
                });
            } else {
                callback();
            }
        },
        err => {
            if (err) {
                winston.error('An error occurred while getting aditional datasets.', err);
                return res.status(500).json({ error: 'An error occurred while getting aditional datasets.' });
            }

            if (sourcesToPull.length === 0) {
                return res.json({ sources });
            }

            // for each of the child datasources that aren't in s3
            datasource_description.remove({ _id: { $in: sourcesToPull } }, (err, results) => {
                if (err) {
                    winston.error('An error occurred while getting aditional datasets.', err);
                    return res.status(500).json({ error: 'An error occurred while getting aditional datasets.' });
                }

                if (results.nRemoved === sourcesToPull.length) {
                    datasource_description
                        .find({
                            schema_id: req.params.id,
                            $or: [{ replaced: false }, { replaced: { $exists: false } }],
                        })
                        .lean()
                        .deepPopulate('schema_id _team schema_id._team')
                        .exec((err, removedSources) => {
                            if (err) {
                                winston.error(
                                    `Error getting the additional datasources with schema id : ${req.params.id}`,
                                    err
                                );
                                return res.status(500).json({
                                    error: `Error getting the additional datasources with schema id : ${req.params.id}`,
                                });
                            }

                            res.json({
                                sources: removedSources,
                                error:
                                    'There was a problem importing your appended datasource. Please contact support.',
                            });
                        });
                }
            });
        }
    );
};

module.exports.getAdditionalSourcesWithSchemaID = function(req, res) {
    if (!req.params.id) {
        return res.status(500).send('No SchemaID given');
    }

    findBySchemaId(req.params.id, (err, sources) => {
        if (err) {
            winston.error(`Error getting the additional datasources with schema id : ${req.params.id}`, err);
            return res
                .status(500)
                .json({ error: `Error getting the additional datasources with schema id : ${req.params.id}` });
        }

        if (sources.length === 0) {
            return res.status(200).json({ sources: sources });
        }

        req.sources = sources;

        // get the permissions for the parent dataset
        uploadHelpers.getDatasetPermissions({ description: sources[0].schema_id }, function(err, args) {
            if (err) {
                winston.error('An error occurred while getting additional sources.', err);
                return res.status(500).send({ error: 'An error occurred while getting additional sources.' });
            }

            const { description } = args;
            let getAdditionalDatasetsFunction;

            if (!description.permissions.includes('useStandardGet')) {
                try {
                    getAdditionalDatasetsFunction = require(path.join(
                        __dirname,
                        '/../../../../user/',
                        description._team.subdomain,
                        '/src/import'
                    )).getAdditionalDatasets;
                } catch (e) {
                    winston.warn(
                        'No get dataset function for team ' +
                            description._team.subdomain +
                            '. Add "useStandardGet" to visualization ACL'
                    );
                }
            }

            if (typeof getAdditionalDatasetsFunction !== 'function') {
                getAdditionalDatasetsFunction = getAdditionalDatasets;
            }

            getAdditionalDatasetsFunction(req, res);
        });
    });
};

/**
 * Update datasource description
 * TODO: This has to be rewrite, now it updates with any values that FE sends.
 *
 * @param {request} req
 * @param {response} res
 */
module.exports.update = function(req, res) {
    datasource_description.findByIdAndUpdate(req.params.id, { $set: req.body }, err => {
        if (err) {
            winston.error('An error occurred while updating a datasource description.', err);
            return res.status(500).json({ error: 'An error occurred while updating a datasource description.' });
        } else {
            return res.status(200).send('ok');
        }
    });
};

module.exports.getJob = async (req, res) => {
    try {
        const { jobId } = await datasource_description.findById(req.params.datasetId, { jobId: 1 }).lean();

        if (!jobId) {
            return res.status(200).json({ job: null });
        }

        async.parallel(
            [callback => kue.Job.get(jobId, callback), callback => kue.Job.log(jobId, callback)],
            (error, [job, logs]) => {
                if (error) {
                    winston.error('An error occurred while getting job.', error);
                    return res.status(500).json({ error: 'An error occurred while getting job.' });
                }

                return res.status(200).json({
                    job: {
                        ..._.pick(job, ['id', 'type', 'data']),
                        state: job.state(),
                        logs,
                    },
                });
            }
        );
    } catch (error) {
        winston.error('An error occurred while getting job.', error);
        return res.status(500).json({ error: 'An error occurred while getting job.' });
    }
};

module.exports.draft = async (req, res) => {
    try {
        const description = await datasource_description
            .findById(req.params.datasetId, {
                columns: 1,
                raw_rowObjects_coercionScheme: 1,
                fe_fieldDisplayOrder: 1,
                fe_excludeFields: 1,
            })
            .lean();
        const updateStatement = {
            $set: {
                ..._.omit(req.body, ['_id']),
                master_id: description._id,
            },
        };

        if (_.has(req.body, 'colorMapping')) {
            updateStatement.$set.colorMapping = setSafeColorMapping(req.body.colorMapping);
        }

        const { message } = mandatorySettings.determineMandatorySettings(
            description.columns,
            description.raw_rowObjects_coercionScheme,
            description.fe_fieldDisplayOrder,
            description.fe_excludeFields,
            updateStatement,
            req.body.fe_views
        );

        if (message) {
            return res.status(400).json({ error: message });
        }

        await datasource_description.findOneAndUpdate({ master_id: description._id }, updateStatement, {
            upsert: true,
            select: {},
        });

        return res.json({ success: true });
    } catch (error) {
        winston.error('An error occurred while getting draft.', error);
        return res.status(500).json({ error: 'An error occurred while getting draft.' });
    }
};

module.exports.save = async (req, res) => {
    // Only super admin can set state prop here
    if (req.body.state) {
        const user = await User.findById(req.user);

        if (!user.isSuperAdmin()) {
            _.unset(req.body, 'state');
        }
    }

    if (!req.body._id) {
        // Creating of New Dataset
        saveHelpers
            .createNewDataset(req)
            .then(data => {
                return res.json(data.data);
            })
            .catch(data => {
                return res.status(data.statusCode).json({ error: data.error });
            });
    } else {
        try {
            const args = await saveHelpers.updateExistingDataset(req.body, req.user);

            let getDatasetFunction;

            if (!args.description.permissions.includes('useStandardGet')) {
                try {
                    getDatasetFunction = require(path.join(
                        __dirname,
                        '/../../../../user/',
                        args.description._team.subdomain,
                        '/src/import'
                    )).getDataset;
                } catch (e) {
                    winston.error(
                        {
                            error: `No get dataset function for team ${args.description._team.subdomain}. Add "useStandardGet" to visualization ACL`,
                        },
                        e
                    );
                    return res.status(500).json({
                        error: `No get dataset function for team ${args.description._team.subdomain}. Add "useStandardGet" to visualization ACL`,
                    });
                }
            }

            if (typeof getDatasetFunction !== 'function') {
                getDatasetFunction = getDatasetDefault;
            }

            _.assign(req, args);
            req.params.id = req.body._id;

            getDatasetFunction(req, res);
        } catch (err) {
            const error = err.errorWithData ? err.error : err;
            handleError(error, res);
        }
    }
};

module.exports.uploadAncillaryFile = (req, res) => {
    if (!req.body.id) {
        return res.status(500).json({ error: 'no ID given' });
    }

    uploadHelpers
        .uploadAncillaryFile(req.body.id, req.files[0])
        .then(({ statusCode, data }) => {
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(data));
        })
        .catch(({ statusCode, error }) => {
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ data: { error: error } }));
        });
};

module.exports.getAncillary = async (req, res) => {
    try {
        const dataset = await datasource_description
            .findByUidAndTeamSubdomain(req.params.uid, req.params.team);

        const description = await datasource_description.findById(dataset._id).populate('_team');

        if (!description.isPublic && !req.user) {
            return res.status(403).send('Not allowed to read private ancillary file.');
        }

        return datasource_file_service
            .getAncillaryFile(description)
            .createReadStream()
            .pipe(res);
    } catch (err) {
        if (err) {
            return res.status(500).send(`Ancillary File Error: ${err}`);
        }
    }
};

// There are a few cases for upload:
// •    regular upload
// •    upload an additional (child) dataset
// •    reimport CSV
// •    reimport child dataset
// •    reimport API – in this case, we won’t save a copy
module.exports.upload = (req, res) => {
    if (process.env.NODE_ENV === 'testing') {
        req.user = req.body.user;
    }

    if (!req.body.id) {
        return res.status(500).json({ error: 'No ID given' });
    }

    const child = req.body.child;
    const replacement = req.body.replacement === 'true';
    let uploadCancelled = false;

    res.connection.setTimeout(0);

    req.on('close', () => {
        uploadCancelled = true;
    });

    const args = {
        user: req.user,
        datasetId: req.body.id,
        replaced_id: req.body.replaced_id,
        child,
        replacement,
        description: null,
        file: req.file,
        jsonPath: req.body.JSONPath,
        smartsheet: req.body.smartsheet,
    };

    const tasks = [
        async.apply(uploadHelpers.findDataset, args),
        uploadHelpers.getDatasetPermissions,
        (args, done) => {
            if (uploadCancelled) {
                return done(new Error('Upload has been canceled'));
            }

            done(null, args);
        },
    ];

    if (replacement) {
        if (child) {
            tasks.push((args, done) => {
                reimport
                    .saveChildCopy(args.datasetId, args.replaced_id)
                    .then(data => {
                        data.description.permissions = args.description.permissions;
                        args.description = data.description;
                        args.originalChildFileName = data.originalChildFileName;
                        done(null, args);
                    })
                    .catch(err => {
                        winston.error(`reimport saveChildCopy error: ${err}`);
                        done(err);
                    });
            });
        } else {
            tasks.push((args, done) => {
                args.oldDescription = _.cloneDeep(args.description);

                reimport
                    .saveCopy(args.description, args.user)
                    .then(copiedDescription => {
                        if (!copiedDescription) {
                            winston.error('Description was not copied');
                            return done(new Error('Description was not copied'));
                        }

                        copiedDescription.permissions = args.description.permissions;
                        args.description = copiedDescription;
                        datasource_description.findByIdAndUpdate(args.datasetId, { replaced: true }, err => {
                            if (err) {
                                winston.error(`could not update dataset ${args.datasetId}, error: ${err}`);
                                return done(new Error(`could not update dataset ${args.datasetId}, error: ${err}`));
                            }
                            done(null, args);
                        });
                    })
                    .catch(error => {
                        winston.error(`reimport saveCopy error: ${error}`);
                        done(new Error(`reimport saveCopy error: ${error}`));
                    });
            });
        }
    }

    if (child && !replacement) {
        tasks.push((args, done) => {
            uploadHelpers.createChild(args.description, (error, data) => {
                if (error) {
                    done(new Error(`createChild for id: ${args.description} with error: ${error}`));
                } else {
                    data.description.permissions = args.description.permissions;
                    args.description = data.description;
                    done(null, args);
                }
            });
        });
    }

    // validate file
    tasks.push((args, done) => {
        indexHelpers.validateFile(req.file, args.description, err => {
            if (err) {
                winston.error(`Error validating file for dataset: ${args.description.title}`);
                return done(err);
            }
            args.description.fileName = args.file.originalname;
            done(null, args);
        });
    });

    tasks.push((args, done) => {
        if (uploadCancelled) {
            return done(new Error('Upload has been canceled'));
        }

        const readDatasourceFunction = getHelpers.getReadDatasourceFunction(args.description);

        readDatasourceFunction(
            replacement,
            args.description,
            fs.createReadStream(args.file.path),
            (err, columns, missingSamples, overrideColumns) => {
                if (err) {
                    winston.error(
                        `Error validating datasource from file (${args.file.originalname}): error ${err.message}`
                    );
                    if (replacement) {
                        if (child) {
                            return datasource_description.findById(args.replaced_id).exec((error, originalChildDoc) => {
                                if (error) {
                                    return done(error);
                                }

                                if (!originalChildDoc) {
                                    return done(new Error('Could not find original child document'));
                                }

                                originalChildDoc.schema_id = args.datasetId;
                                originalChildDoc.save();
                                args.description.remove(error => done(error || err));
                            });
                        }

                        return reimport.removeReimportedDatasetAndReferences(
                            args.description._id,
                            args.datasetId,
                            error => {
                                if (error) {
                                    winston.error(`reimport.removeReimportedDatasetAndReferences error: ${error}`);
                                    return done(
                                        new Error(`reimport.removeReimportedDatasetAndReferences error: ${error}`)
                                    );
                                }

                                args.description.remove(error => done(error || err));
                            }
                        );
                    }

                    args.description.fileName = undefined;
                    args.description.format = undefined;
                    args.description.save();

                    return done(err);
                }

                // file validation ok
                winston.debug(`File validation okay: ${args.file.originalname}`);

                args.missingSamples = missingSamples;
                args.overrideColumns = overrideColumns;

                if (_.isEmpty(columns)) {
                    args.description.columns.forEach(column => {
                        column.sourceName = indexHelpers.getSourceName(args.description);
                    });
                }

                saveHelpers.processColumns(columns, args.description);

                if (!args.description.uid && !child) {
                    args.description.uid = imported_data_preparation.DataSourceUIDFromTitle(args.description.title);
                }

                let uploadToDataset = args.description._id;

                if (child) {
                    uploadToDataset = args.datasetId;
                }

                // if the parent dataset has been replaced, we also have to save the child csv to the parent path in
                // aws - can copy it over
                if (replacement && !child) {
                    return reimport.copyChildElement(args.description, args.file, uploadToDataset, err => {
                        if (err) {
                            winston.error(`copyChildElement error: ${err}`);
                            return done(new Error(`copyChildElement error: ${err}`));
                        }

                        done(null, args);
                    });
                }

                // !important - if child dataset with same filename is uploaded to s3, it'll just get deleted in
                // bulk with the other child dataset
                if (replacement && child && args.file.originalname === args.originalChildFileName) {
                    args.file.originalname = `1-${args.file.originalname}`;
                }
                datasource_file_service.uploadDataSource(
                    args.file.path,
                    args.file.originalname,
                    args.file.mimetype,
                    args.team.subdomain,
                    uploadToDataset,
                    err => {
                        if (err) {
                            winston.error(
                                `Error during uploading the dataset into AWS: ${args.file.originalname} (${err.message})`
                            );
                            return done(
                                new Error(
                                    `Error during uploading the dataset into AWS: ${args.file.originalname} (${err.message})`
                                )
                            );
                        }

                        winston.debug(
                            `Upload data source ${args.file.path} ${args.file.originalname} dataset: ${args.datasetId}`
                        );
                        done(null, args);
                    }
                );
            }
        );
    });

    if (replacement && child) {
        tasks.push((args, done) => {
            if (uploadCancelled) {
                return done(new Error('Upload has been canceled'));
            }

            const key = path.join(
                args.team.subdomain,
                '/datasets/',
                args.datasetId,
                '/datasources/',
                args.originalChildFileName
            );
            datasource_file_service.deleteObject(key, err => {
                if (err) {
                    return done(err);
                }

                done(null, args);
            });
        });
    }

    tasks.push((args, done) => {
        if (uploadCancelled) {
            return done(new Error('Upload has been canceled'));
        }

        winston.info('Uploaded datasource : ' + req.file.originalname);

        if (child) {
            const updateQuery = {
                format: args.description.format,
                fileName: args.file.originalname,
                raw_rowObjects_coercionScheme: args.description.raw_rowObjects_coercionScheme,
                dirty: 1,
                imported: false,
                $unset: {
                    fe_nestedObject: 1,
                    imageScraping: 1,
                    isPublic: 1,
                    customFieldsToProcess: 1,
                    _otherSources: 1,
                    fe_filters: 1,
                    fe_fieldDisplayOrder: 1,
                    urls: 1,
                    importRevision: 1,
                },
            };
            datasource_description.findOneAndUpdate({ _id: args.description._id }, updateQuery, err => {
                if (err) {
                    winston.error(
                        `Error saving the dataset into the database: ${args.description.title} (${err.message})`
                    );
                    return done(
                        new Error(
                            `Error saving the dataset into the database: ${args.description.title} (${err.message})`
                        )
                    );
                }

                done(null, args);
            });
        } else {
            args.description.createdFields = args.description.createdFields.filter(
                ({ name }) => !args.overrideColumns.includes(name)
            );
            args.description.dirty = 1; // Full Import with image scraping
            datasource_description.findByIdAndUpdate(args.description._id, args.description, err => {
                if (err) {
                    winston.error(
                        `Error saving the dataset raw row coercion update into the database, UID:  ${args.description.uid} (${err.message}`
                    );
                    return done(
                        new Error(
                            `Error saving the dataset raw row coercion update into the database, UID:  ${args.description.uid} (${err.message}`
                        )
                    );
                }

                done(null, args);
            });
        }
    });

    if (replacement) {
        tasks.push(async (args, done) => {
            try {
                const jobId = await saveHelpers.startJobIfNeeded(args.description._id, 1);
                const data = { jobId, tabDestination: 1 };

                datasource_description.findOneAndUpdate({ _id: args.description._id }, data, err => done(err, args));
            } catch (error) {
                done(error);
            }
        });
    }

    async.waterfall(tasks, async (err, args) => {
        try {
            if (handleError(err, res, 'An error occurred while uploading a dataset.')) {
                return;
            }

            if (args.oldDescription) {
                const {
                    description: { _id: toId },
                    oldDescription: { _id: fromId },
                } = args;

                await User.updateMany({ _editors: fromId }, { $set: { '_editors.$': toId } });
                await User.updateMany({ _viewers: fromId }, { $set: { '_viewers.$': toId } });
            }

            const data = {
                replacement: args.replacement,
                fileName: args.file.originalname,
                missingSamples: args.missingSamples || [],
                overrideColumns: args.overrideColumns || [],
                ..._.pick(args.description, [
                    '_id',
                    'uid',
                    'jobId',
                    'raw_rowObjects_coercionScheme',
                    'columns',
                    'fe_excludeFields',
                    'fe_excludeFieldsObjDetail',
                    'format',
                    'replaced_id',
                ]),
            };

            if (args.replacement) {
                data.user = await User.findById(req.user);
            }

            res.json(data);
        } catch (err) {
            handleError(err, res, 'An error occurred while uploading a dataset.');
        }
    });
};

module.exports.getAvailableMatchFns = (req, res) => {
    return res.json({
        availableMatchFns: Object.keys(processing.MatchFns),
    });
};

module.exports.download = (req, res) => {
    if (!req.params.id) {
        return res.status(500).send('Invalid parameter');
    }
    if (req.query.originalOrModified === 'original') {
        download.downloadOriginal(req, res);
    } else if (req.query.originalOrModified === 'modified') {
        download.downloadModified(req, res);
    }
};

module.exports.downloadLatest = (req, res) => {
    if (!req.params.uid || !req.params._team) {
        return res.status(500).send('Download error: Missing parameters');
    }

    download.downloadLatestModified(req, res);
};

module.exports.removeSubdataset = (req, res) => {
    if (!req.body.id) {
        return res.status(500).send('Invalid parameter');
    }

    datasource_description
        .findById(req.body.id)
        .deepPopulate('schema_id schema_id._team')
        .exec((err, doc) => {
            if (err) {
                winston.error('Error encountered during find description : ', err);
                return res.status(500).send({ error: 'An error occurred while removing subdataset' });
            }
            if (doc.connection) {
                doc.remove(err => {
                    if (err) {
                        winston.error('Error encountered during remove description : ', err);
                        return res
                            .status(500)
                            .send({ error: 'An error occurred while removing subdataset description' });
                    }
                    return res.status(200).send('ok');
                });
            } else {
                const key =
                    doc.schema_id._team.subdomain + '/datasets/' + doc.schema_id._id + '/datasources/' + doc.fileName;
                datasource_file_service.deleteObject(key, (err, result) => {
                    if (err) {
                        winston.error('An error occurred while removing subdataset', err);
                        return res.status(500).send({ error: 'An error occurred while removing subdataset' });
                    }
                    doc.remove(err => {
                        if (err) {
                            winston.error('Error encountered during remove description', err);
                            return res
                                .status(500)
                                .send({ error: 'An error occurred while removing subdataset description' });
                        }
                        return res.status(200).send('ok');
                    });
                });
            }
        });
};

module.exports.deleteBanner = function(req, res) {
    miscHelpers
        .deleteBanner(req.params.id, req.user)
        .then(description => res.json({ dataset: description }))
        .catch(err => {
            winston.error('An error occurred while deleting banner', err);
            return res.status(500).send({ error: 'An error occurred while deleting banner' });
        });
};

// break this up when there's more time
module.exports.getPreviousVersions = (req, res) => {
    let returnObj = [];

    datasource_description
        .findById(req.params.id)
        .deepPopulate('previous_datasets previous_datasets.author')
        .exec((err, dataset) => {
            if (err) {
                winston.error(`Error when getting description: ${err.message}`);
                return res.status(500).json({ error: 'An error occurred while getting previous dataset versions.' });
            }

            async.each(
                dataset.previous_datasets,
                (previous_dataset, callback) => {
                    let infoToReturn = {};
                    infoToReturn.uid = previous_dataset.uid;
                    infoToReturn.importRevision = previous_dataset.importRevision;
                    const { firstName = '', lastName = '' } = _.get(previous_dataset, 'author', {});
                    infoToReturn.author = `${firstName} ${lastName}`;
                    infoToReturn.initial = firstName[0];
                    infoToReturn.date = new Date(previous_dataset.createdAt).toDateString();
                    infoToReturn.time = new Date(previous_dataset.createdAt).toLocaleTimeString();
                    infoToReturn.id = previous_dataset._id;
                    Story.count({ datasourceDescription: previous_dataset._id }, (err, count) => {
                        if (err) {
                            return callback(err);
                        }
                        infoToReturn.stories = count;
                        returnObj.push(infoToReturn);
                        callback(null);
                    });
                },
                err => {
                    if (err) {
                        winston.error('Something went wrong when retrieving previous versions');
                        return res
                            .status(500)
                            .send({ error: 'An error occurred while getting previous dataset versions.' });
                    }

                    res.json(_.sortBy(returnObj, 'importRevision'));
                }
            );
        });
};

module.exports.revert = (req, res) => {
    miscHelpers
        .revert(req.params.previous, req.params.current, req.user)
        .then(dataset => res.json(dataset))
        .catch(err => {
            winston.error('An error occurred while reverting a dataset.', err);
            return res.status(500).json({ error: 'An error occurred while reverting a dataset.' });
        });
};

module.exports.canExcludeField = async (req, res) => {
    const { name, id } = req.params;

    if (!name) {
        return res.status(400).json({ error: 'No field name was specified' });
    }

    if (!Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'No dataset id was specified' });
    }

    try {
        const description = await datasource_description.findById(id);

        let excludeField = {
            [name]: true,
        };

        await saveHelpers.isFieldUsed(excludeField, description, req.user);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.sendStatus(200);
};

// Field values for color mapping
// expects req.datasourceDescription.id
module.exports.getCachedValues = function(req, res) {
    miscHelpers
        .getCachedValues(req.params.id, req.params.field)
        .then(formattedValues => res.status(200).send(formattedValues))
        .catch(err => {
            winston.error('An error occurred while getting cached values.', err);
            return res.status(500).send({ error: 'An error occurred while getting cached values.' });
        });
};

module.exports.preImport = (req, res) => {
    queueHelpers
        .preImport(req.user, req.params.id)
        .then(({ statusCode, data }) => res.status(statusCode).send(data))
        .catch(({ statusCode, error }) => res.status(statusCode).send(error));
};
module.exports.importProcessed = (req, res) => {
    queueHelpers
        .importProcessed(req.user, req.params.id)
        .then(({ statusCode, data }) => res.status(statusCode).send(data))
        .catch(({ statusCode, error }) => res.status(statusCode).send(error));
};
module.exports.scrapeImages = (req, res) => {
    queueHelpers
        .scrapeImages(req.user, req.params.id)
        .then(({ statusCode, data }) => res.status(statusCode).send(data))
        .catch(({ statusCode, error }) => res.status(statusCode).send(error));
};
module.exports.postScrapeImages = (req, res) => {
    if (!_.isArray(req.body.rowIds) || req.body.rowIds.length === 0) {
        return res.status(400).send('Please specify an Array of Row Ids in the Request Body.');
    } else {
        queueWorkerHelpers.scrapeImages(
            {
                log: _.noop,
                progress: _.noop,
            },
            req.params.id,
            req.body.rowIds,
            (err, mongoUpdateResponse) => {
                if (err) {
                    winston.error(`Could not scrape images: ${err.message}`);
                    return res.status(500).send('Failed to update images.');
                }

                if (mongoUpdateResponse.ok !== 1) {
                    winston.error(`Mongo Update Error: ${err.message}`);
                    return res.status(500).send('Failed to update images.');
                }

                return res.status(200).send('Successfully scraped requested images');
            }
        );
    }
};
module.exports.postImport = (req, res) => {
    queueHelpers
        .postImport(req.user, req.params.id)
        .then(({ statusCode, data }) => res.status(statusCode).send(data))
        .catch(({ statusCode, error }) => res.status(statusCode).send(error));
};
module.exports.getJobStatus = (req, res) => {
    queueHelpers
        .getJobStatus(req.params.id)
        .then(({ statusCode, data }) => res.status(statusCode).send(data))
        .catch(({ statusCode, error }) => res.status(statusCode).send(error));
};
module.exports.killJob = (req, res) => {
    queueHelpers
        .killJob(req.params.id)
        .then(({ statusCode, data }) => res.status(statusCode).send(data))
        .catch(({ statusCode, error }) => res.status(statusCode).send(error));
};
module.exports.getKeywords = keywordsHelpers.getKeywords;

async function startJob(req, res) {
    try {
        validateObjectId(req.params.id);

        const statusCode = await queueHelpers.startJob(req.params.id);

        res.sendStatus(statusCode);
    } catch (err) {
        handleError(err, res);
    }
}
