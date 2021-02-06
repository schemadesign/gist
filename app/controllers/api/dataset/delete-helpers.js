const winston = require('winston');
const async = require('async');
const Batch = require('batch');
const cluster = require('cluster');
const { isEmpty } = require('lodash');

const datasource_description = require('../../../models/descriptions');
const Cron = require('../../../models/crons');
const cronHelper = require('../../../boot/cron-init');
const datasource_file_service = require('../../../libs/utils/aws-datasource-files-hosting');

/**
 * Delete the sources.
 *
 * @param {integer|ObjectId} datasetId
 */
const deleteSource = datasetId =>
    new Promise((resolve, reject) => {
        datasource_description
            .findById(datasetId)
            .populate('_team')
            .exec((err, description) => {
                if (err) {
                    return reject(err);
                }
                if (!description) {
                    return reject(`Datasource id ${datasetId} not found`);
                }

                if (description.apiEndPoint) {
                    description.apiEndPoint = undefined;
                    description.format = undefined;
                    description.JSONPath = undefined;
                    description.save(err => (err ? reject(err) : resolve()));
                } else if (description.connection && description.connection.url) {
                    description.connection = undefined;
                    description.markModified('connection');
                    description.save(err => (err ? reject(err) : resolve()));
                } else if (description.fileName) {
                    const key = `${description._team.subdomain}/datasets/${description.uid}/datasources/${description.uid}_v${description.importRevision}`;

                    datasource_file_service.deleteObject(key, (err, result) => {
                        if (err) {
                            return reject(err);
                        }
                        description.fileName = null;
                        description.save(err => (err ? reject(err) : resolve(result)));
                    });
                }
            });
    });
module.exports.deleteSource = deleteSource;

/**
 * Gets list of dataset to remove
 *
 * @param {ObjectId} datasetId
 */
const findDataset = (datasetId, next) => {
    let descriptions = [];
    datasource_description
        .findById(datasetId)
        .populate('_team')
        .exec((err, data) => {
            if (err) {
                return next(err);
            }

            if (!data) {
                return next(new Error(`No datasource with id: ${datasetId} exists`));
            }

            descriptions.push(data);

            if (!isEmpty(data.previous_datasets)) {
                data.previous_datasets.map(async id => {
                    await datasource_description.findById(id, (err, dataset) => {
                        if (dataset) {
                            descriptions.push(dataset);
                        }
                    });
                });

                next(null, descriptions);
            } else {
                next(null, descriptions);
            }
        });
};
module.exports.findDataset = findDataset;

/**
 * Remove datasource with given schema id.
 *
 * @param {array} descriptions
 * @param {function} next
 */
const removeDatasourceWithSchemaId = (descriptions, next) => {
    async.each(
        descriptions,
        (description, done) => {
            datasource_description
                .find({ $or: [{ schema_id: description._id }, { master_id: description._id }] })
                .populate('_team')
                .exec((err, results) => {
                    if (err) {
                        return next(err);
                    }

                    results.forEach(element => {
                        element.remove();
                    });
                    winston.info(
                        'Removed all the schema descriptions and working draft inherited to the datasource description : ' +
                            description._id
                    );
                    done();
                });
        },
        err => next(err, descriptions)
    );
};
module.exports.removeDatasourceWithSchemaId = removeDatasourceWithSchemaId;

/**
 * Remove other sources.
 *
 * @param {array} descriptions
 * @param {function} done
 */
const removeOtherSources = (descriptions, done) => {
    async.each(
        descriptions,
        (description, next) => {
            datasource_description.find(
                { _otherSources: description._id, 'relationshipFields.by.joinDataset': description._id.toString() },
                (err, docs) => {
                    if (err) {
                        next(err);
                    } else {
                        if (docs.length === 0) {
                            return next();
                        }

                        async.each(
                            docs,
                            (doc, next2) => {
                                let index = doc._otherSources.indexOf(description.uid);
                                doc._otherSources.splice(index, 1);
                                doc.relationshipFields = doc.relationshipFields.filter(field => {
                                    return field.by.joinDataset !== description._id.toString();
                                });
                                doc.dirty = 1;
                                doc.save(next2);
                            },
                            err => {
                                winston.info(
                                    `Removed all the merged description settings inherited to the datasource description: ${description._id}`
                                );
                                next(err);
                            }
                        );
                    }
                }
            );
        },
        err => done(err, descriptions)
    );
};
module.exports.removeOtherSources = removeOtherSources;

/**
 * Remove cron jobs.
 *
 * @param {array} descriptions
 * @param {function} next
 */
const removeCronJobs = (descriptions, next) => {
    async.each(
        descriptions,
        (description, done) => {
            Cron.findOne({ datasourceDescription: description._id }, (err, schedule) => {
                if (err) {
                    return done(err);
                } else if (schedule) {
                    if (cluster.isMaster) {
                        cronHelper.execute('pause', schedule._id, (err, job) => {
                            if (err) {
                                return done(err);
                            } else {
                                winston.info('Stopped the schedule job');
                                schedule.remove(done);
                            }
                        });
                    } else {
                        winston.info('Send to other process to stop the job');
                        process.send({ command: 'pause', id: schedule._id });
                        schedule.remove(done);
                    }
                } else {
                    return done();
                }
            });
        },
        err => next(err, descriptions)
    );
};
module.exports.removeCronJobs = removeCronJobs;
