const winston = require('winston');
const cluster = require('cluster');
const { CronJob } = require('cron');
const async = require('async');
const Batch = require('batch');
const path = require('path');
const { noop, isNumber } = require('lodash');

const datasetHelpers = require('../controllers/api/dataset/index-helpers');
const getHelpers = require('../controllers/api/dataset/get-helpers');
const uploadHelpers = require('../controllers/api/dataset/upload-helpers');
const { getFileStream } = require('../controllers/api/dataset/save-helpers');
const CronModel = require('../models/crons');
const datasource_description = require('../models/descriptions');
const queue = require('./queue-init');

const jobs = {};

const findDescription = ({ datasourceDescription }, callback) => {
    datasource_description.findById(datasourceDescription, callback);
};

const applyPermissions = (description, callback) => {
    uploadHelpers.getDatasetPermissions({ description }, (err, { description }) => callback(err, description));
};

const invokeReadDatasourceFunction = async (description, callback) => {
    const readDatasourceFunction = getHelpers.getReadDatasourceFunction(description);

    readDatasourceFunction(true, description, await getFileStream(description), (err, columns) => callback(err, columns, description));
};

const getSaveColumnsFunction = (description) => {
    if (description.permissions.indexOf('useStandardSaveColumns') === -1) {
        try {
            const importCtrl = require(path.join(__dirname, '/../../../../user/', description._team.subdomain, '/src/import'));
            if (importCtrl.saveColumnsToRowObjects !== undefined) {
                return importCtrl.saveColumnsToRowObjects;
            }
        } catch (e) {
            winston.error(`no import controller for team ${description._team.subdomain} but is customViz. Add "useStandardSaveColumns" to visualization acl.`);
        }
    }

    return datasetHelpers.saveColumnsToRowObjects;
};

const updateDescription = ({ updatedBy }, columns, description, callback) => {
    if (columns.length > 0) {
        const saveColumns = getSaveColumnsFunction(description);

        description.raw_rowObjects_coercionScheme = saveColumns(columns);
        description.columns = columns;
    }

    description.lastImportErrorLog = null;
    description.lastImportInitiatedBy = updatedBy;
    description.lastImportTriggeredBy = 'automated';
    description.save(err => callback(err, description._id));
};

const initJob = (descriptionId, callback) => {
    queue.initJob(descriptionId, 'preImport', err => callback(err));
};

function execute(command, jobId, next = noop) {
    const batch = new Batch();
    batch.concurrency(1);

    let job;

    batch.push((done) => {
        CronModel.findById(jobId, (err, jobData) => {
            if (err) {
                return done(err);
            }

            if (!jobData) {
                return done(new Error('Cannot find that job'));
            }

            job = jobData;
            done();
        });
    });

    // currently this is only available for apiEndPoint dataset types
    batch.push((done) => {
        if (jobs[jobId]) {
            jobs[jobId].stop();
        }
        if (command === 'resume') {
            jobs[jobId] = new CronJob({
                cronTime: job.time,
                onTick() {
                    async.waterfall([
                        async.apply(findDescription, job),
                        applyPermissions,
                        invokeReadDatasourceFunction,
                        async.apply(updateDescription, job),
                        initJob,
                    ], (err) => {
                        if (err) {
                            job.errorLog = err;
                            job.retries = isNumber(job.retries) ? job.retries + 1 : 0;
                            if (job.retries > 2) {
                                job.status = 'pause';
                                jobs[jobId].stop();
                            }
                            return job.save();
                        }

                        job.errorLog = '';
                        job.retries = 0;
                        job.save();
                    });
                },
                start: false,
            });

            jobs[jobId].start();
        }

        if (cluster.isMaster) {
            job.status = (command === 'pause') ? 'pause' : 'running';
            job.save();
        }
        done();
    });

    batch.end((err) => {
        if (err) {
            winston.error(err);
        }

        next(err, job);
    });
}

if (cluster.isMaster) {
    CronModel.find({ status: 'running' }, (err, allJobs) => {
        if (err) {
            return winston.error('cannot set up automated jobs:', err);
        }

        async.each(
            allJobs,
            (job, next) => {
                execute('resume', job._id);

                // ignore errors in jobs
                next();
            },
            () => winston.info('scheduled all the automated jobs'),
        );
    });
}

module.exports.execute = execute;
module.exports.jobs = jobs;
