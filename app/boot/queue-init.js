const { identity } = require('lodash');
const cluster = require('cluster');
const datasource_description = require('../models/descriptions');

const kue = require('kue');
const winston = require('winston');

winston.debug(`REDIS_URL: ${process.env.REDIS_URL}`);
const queue = kue.createQueue({
    redis: process.env.REDIS_URL,
});
module.exports.queue = queue;
const async = require('async');
const Batch = require('batch');

const mongoose_client = require('../models/mongoose_client');
const raw_source_documents = require('../models/raw_source_documents');
const cached_values = require('../models/cached_values');
const CronModel = require('../models/crons');

/**
 *
 * @param {string} jobName
 * @param {*} data
 * @param {function} next
 */
const scheduleJob = (jobName, data, next = identity) => new Promise((resolve, reject) => {
    const job = queue.create(jobName, data);

    job.ttl(9000000).save((error) => {
        if (error) {
            winston.error(`kue.Job.scheduleJob error: ${error}`);
            reject(error);
            return next(error, job);
        }

        resolve(job);
        return next(null, job, data);
    });
});
module.exports.scheduleJob = scheduleJob;

const initJob = (datasetId, jobName, next) => {
    scheduleJob(jobName, { id: datasetId })
        .then((job) => {
            datasource_description.findOneAndUpdate(
                { _id: datasetId },
                { $set: { jobId: job.id } },
                { new: true },
                (error, updatedDataset) => {
                    if (error) {
                        winston.error(`kue.Job.create datasource_description.findOneAndUpdate error: ${error}`);
                        return next(error);
                    }

                    if (!updatedDataset) {
                        return next(new Error('not dataset found'));
                    }

                    next(null, updatedDataset);
                },
            );
        });
};
module.exports.initJob = initJob;
module.exports.worker = queue;

const _replaceDatasetWithAutomatedOne = (dataset, next) => {
    const subBatch = new Batch();

    subBatch.push((done) => {
        mongoose_client.dropCollection(`rawrowobjects-${dataset._id}`, () => {
            mongoose_client.renameCollection(`rawrowobjects-${dataset._id}-automated`, `rawrowobjects-${dataset._id}`, (err) => {
                if (err && err.code !== 26) {
                    winston.error(`_replaceDatasetWithAutomatedOne.dropCollection rawrowobjects err: ${err}`);
                    return done(err);
                }

                winston.info(`renamed the automated 'rro' collection to rawrowobjects-${dataset._id}`);
                done();
            });
        });
    });

    subBatch.push((done) => {
        mongoose_client.dropCollection(`processedrowobjects-${dataset._id}`, () => {
            mongoose_client.renameCollection(`processedrowobjects-${dataset._id}-automated`, `processedrowobjects-${dataset._id}`, (err) => {
                if (err && err.code !== 26) {
                    winston.error(`_replaceDatasetWithAutomatedOne.dropCollection processdrowobjects err: ${err}`);
                    return done(err);
                }

                winston.info(`renamed the autoamted 'pro' collection to processedrowobjects-${dataset._id}`);
                done();
            });
        });
    });

    subBatch.push((done) => {
        raw_source_documents.Model.findOne({ primaryKey: dataset._id }, (error1, originalRawSrcDoc) => {
            raw_source_documents.Model.findOne({ primaryKey: `${dataset._id}-automated` }, (error2, newRawSrcDoc) => {
                if (error1 || error2) {
                    winston.error(`Cannot moved the raw source documents err1: ${error1} err2: ${error2}`);
                    return done(new Error(`Cannot moved the raw source documents err1: ${error1} err2: ${error2}`));
                }

                newRawSrcDoc.primaryKey = dataset._id;
                newRawSrcDoc.save((err) => {
                    if (err) {
                        winston.error(`newRawSrcDoc save err: ${err}`);
                        return done(err);
                    }

                    winston.info('changed raw source documents primary key of the automated one');
                    originalRawSrcDoc.remove(done);
                });
            });
        });
    });

    subBatch.push((done) => {
        cached_values.findOne({ srcDocPKey: dataset._id }, (error1, originalCacheValues) => {
            cached_values.findOne({ srcDocPKey: `${dataset._id}-automated` }, (error2, newCacheValues) => {
                if (error1 || error2) {
                    winston.error(`Cannot move the cached unique values err1: ${error1} err2: ${error2}`);
                    return done(new Error(`Cannot move the cached unique values err1: ${error1} err2: ${error2}`));
                }

                newCacheValues.srcDocPKey = dataset._id;
                newCacheValues.save((err) => {
                    if (err) {
                        winston.error(`newCacheValues save err: ${err}`);
                        return done(err);
                    }

                    winston.info('changed cache unique values srcDocPKey of the automated one');
                    originalCacheValues.remove(done);
                });
            });
        });
    });

    subBatch.end((err) => {
        if (err) {
            winston.error(`Error occurs in the replacing original dataset with the automated one: ${err}`);
        } else {
            winston.info('completed all steps for replacing the original dataset from the automated one');
        }

        return next(err);
    });
};

const _finishAllImportingSteps = (dataset) => {
    const batch = new Batch();
    batch.concurrency(1);

    let replaceDataset = false;

    batch.push((done) => {
        if (dataset.lastImportTriggeredBy === 'automated' && !dataset.lastImportErrorLog) {
            replaceDataset = true;
        }

        done();
    });

    batch.push((done) => {
        if (replaceDataset) {
            _replaceDatasetWithAutomatedOne(dataset, done);
        } else {
            done();
        }
    });

    batch.end((err) => {
        if (err) {
            winston.error(`Error within _finishAllImportingSteps err: ${err}`);
        } else {
            let user = dataset.lastImportInitiatedBy;
            let team = dataset._team;
            if (team === undefined && dataset.schema_id && dataset.schema_id._team) {
                team = dataset.schema_id._team;
                if (!user) {
                    user = dataset.schema_id.lastImportInitiatedBy;
                }
            }
            //TODO I remove for now sending email sendVizFinishProcessingEmail due problem with firing it multiple times
            dataset.jobId = 0;
            dataset.contentEdited = false;

            if (dataset.firstImport > 5) {
                dataset.firstImport = 0;
            }

            dataset.save();
        }
    });
};

const _initJobForAppendedDatasets = (child, dirty, task) => {

    child.forEach((dataset) => {
        if (dirty == 1 || dataset.dirty == 1) {
            if (task === 'scrapeImages' || task === 'importProcessed') {
                initJob(dataset._id, 'preImport', (err) => {
                    if (err) {
                        winston.error(`in initializing job preImport on child dataset err: ${err}`);
                    }

                });
            }
        } else if (dirty == 2) {
            if (task === 'scrapeImages' || task === 'postImport' || task === 'importProcessed') {
                initJob(dataset._id, 'importProcessed', (err) => {
                    if (err) {
                        winston.error(`in initializing job preImport on child dataset err: ${err}`);
                    }

                });
            }
        }
    });
};

const _initJobForMergedDatasets = (jsonObj) => {

    jsonObj.datasets.forEach((dataset) => {
        dataset.dirty = 1;
        dataset.save((err) => {
            if (err) {
                winston.error(`in initializing job scrapeImages on dataset save err ${err}`);
            }

            initJob(dataset._id, 'preImport', (err) => {
                if (err) {
                    winston.error(`in initializing job scrapeImages on job completion err ${err}`);
                }
            });
        });
    });

};

const shutDown = () => {
    queue.shutdown(5000, (err) => {
        if (err) {
            winston.error('Kue shutdown error: ' + err);
        } else {
            winston.debug('Kue shutdown');
        }
        process.exit(0);
    });
};

const killStaleJob = (id, callback) => {
    kue.Job.get(id, (err, job) => {
        const lastUpdated = +Date.now() - job.updated_at;
        // 10 minutes
        if (lastUpdated > 10 * 60000) {
            winston.debug('job ' + job.id + ' hasn\'t been updated in ' + Math.floor(lastUpdated / 60000) + ' minutes - removing');
            job.remove();
            datasource_description.findById(job.data.id, (err, dataset) => {
                if (err || !dataset) {
                    callback(err || new Error('dataset ' + job.data.id + ' not found when killing job ' + job.id));
                } else {
                    dataset.jobId = 0;
                    dataset.save(callback);
                }
            });
        }
    });
};

const checkActiveJobs = () => {
    winston.debug('checking stale jobs');
    queue.watchStuckJobs();

    queue.active((err, ids) => {
        async.map(ids, (id, callback) => {
            killStaleJob(id, err => {
                if (err) {
                    winston.debug(err);
                }
                callback();
            });
        });
    });
};

if (cluster.isMaster) {
    process.on('SIGINT', shutDown);
    process.on('SIGTERM', shutDown);
    // 10 minutes
    const interval = 10 * 60000;
    setInterval(checkActiveJobs, interval);

    queue.on('job enqueue', (id, type) => {
        winston.info('Job %s got enqueued of type %s', id, type);
    }).on('job complete', (id, result) => {
        winston.info(`Job ${id} completed with result`);
        kue.Job.get(id, (err, job) => {
            if (err) {
                winston.error(`kueJob.get err: ${err}`);
                return;
            }
            const task = job.type;
            switch (task) {
                case 'preImport':
                    initJob(job.data.id, 'importProcessed', (err) => {
                        if (err) {
                            winston.error(`in initializing job importProcessed on job completion err: ${err}`);
                        }
                    });
                    break;
                case 'importProcessed':
                case 'postImport':
                case 'scrapeImages':
                    datasource_description.findById(job.data.id)
                        .deepPopulate('lastImportInitiatedBy _team schema_id schema_id._team schema_id.lastImportInitiatedBy')
                        .exec((err, dataset) => {
                            if (err || !dataset) {
                                winston.error(`datasource_description.findById err: ${err}`);
                                return;
                            }

                            let dirty = dataset.dirty;
                            let fe_image = dataset.fe_image;
                            if (dataset.schema_id && dataset.schema_id.fe_image) {
                                fe_image = dataset.schema_id.fe_image;

                                if (dirty === 0 && dataset.schema_id.dirty > dirty) {
                                    dirty = dataset.schema_id.dirty;
                                }
                            }

                            datasource_description.find({ schema_id: job.data.id }, (err, childrenDatasets) => {
                                if (err) {
                                    winston.error('datasource_description.find err: ' + err + ' key: ' + { schema_id: job.data.id });
                                    return;
                                }
                                if (childrenDatasets.length === 0) {

                                    if (task === 'importProcessed') {
                                        initJob(job.data.id, 'postImport', (err) => {
                                            if (err) {
                                                winston.error('in initializing job importProcessed on job completion');
                                            }

                                        });
                                    } else if (task === 'postImport' && !dataset.skipImageScraping && fe_image && fe_image.field && !fe_image.scraped) {
                                        initJob(job.data.id, 'scrapeImages', (err) => {
                                            if (err) {
                                                winston.error('in initializing job importProcessed on job completion');
                                            }

                                        });
                                    } else {

                                        datasource_description.datasetsNeedToReimport(dataset._id, (err, jsonObj) => {
                                            if (err) {
                                                winston.error(`datasource_description.datasetsNeedToReimport err: ${err}`);
                                                return;
                                            }
                                            _finishAllImportingSteps(dataset);
                                            _initJobForMergedDatasets(jsonObj);
                                        });
                                    }

                                } else {
                                    dataset.jobId = 0;
                                    dataset.contentEdited = false;

                                    if (dataset.firstImport > 5) {
                                        dataset.firstImport = 0;
                                    }

                                    dataset.save(() => {
                                        _initJobForAppendedDatasets(childrenDatasets, dirty, task);
                                    });
                                }
                            });
                        });
                    break;
            }
        });

    }).on('job failed', (id, errMsg) => {
        winston.info(`Job ${id} failed with error ${errMsg}`);
        const cron = require('./cron-init');

        kue.Job.get(id, (err, job) => {
            if (err) {
                winston.error(`kue.Job.get err: ${err}`);
                return;
            }
            const datasetId = job.data.id;
            datasource_description.findById(datasetId, (err, dataset) => {
                if (err) {
                    winston.error(`datasource_description.find err: ${err} datasetId: ${job.data.id}`);
                    return;
                }
                if (!dataset) {
                    winston.error('job failed, dataset not found');
                    return;
                }

                dataset.lastImportErrorLog = errMsg;
                dataset.contentEdited = false;
                dataset.jobId = 0;

                CronModel.findOne({ datasourceDescription: dataset._id }, (err, cronJob) => {
                    if (err) {
                        winston.error(`CronModel.findOne err: ${err}`);
                        return;
                    }
                    if (cronJob) {
                        cron.execute('pause', cronJob._id, (err) => {
                            if (err) {
                                winston.error(`job failure cron.execute pause err: ${err}`);
                            } else {
                                dataset.save(); // save the dataset only when the cronjob is paused (if found);
                            }
                        });
                    } else {
                        winston.error(`cronJob for dataset._id: ${dataset._id} not found`);
                        // save the dataset even if there is no cronjob
                        dataset.save();
                    }
                });

            });
        });
    }).on('error', (err) => {
        winston.error(`queue.on err: ${err}`);
    });
}
