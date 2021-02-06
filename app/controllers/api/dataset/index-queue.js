const winston = require('winston');
const kue = require('kue');
const {
    NOT_MODIFIED: STATUS_NOT_MODIFIED,
    OK: STATUS_OK,
} = require('http-status-codes');

const datasource_description = require('../../../models/descriptions');
const queue = require('../../../boot/queue-init');
const saveHelpers = require('./save-helpers');
const { RequestError } = require('../../../libs/system/errors');
require('../../../libs/import/queue-worker');

module.exports = {
    preImport,
    importProcessed,
    scrapeImages,
    postImport,
    killJob,
    getJobStatus,
    startJob,
};

const scheduleJob = (jobName, importedBy, datasetId) => new Promise((resolve, reject) => {
    datasource_description.findByIdAndUpdate(datasetId, {
        $set: {
            lastImportInitiatedBy: importedBy,
            lastImportTriggeredBy: 'manual',
        },
    })
        .exec((error) => {
            if (error) {
                reject({ statusCode: 500, error });
            } else {
                queue.initJob(datasetId, jobName, (error) => {
                    if (error) {
                        winston.error(`${jobName} queue.initJob error: ${error}`);
                        reject({ statusCode: 500, error });
                    } else {
                        resolve({ statusCode: 200, data: 'ok' });
                    }
                });
            }
        });
});

function preImport(importedBy, datasetId) {
    return scheduleJob('preImport', importedBy, datasetId);
}

function importProcessed(importedBy, datasetId) {
    return scheduleJob('importProcessed', importedBy, datasetId);
}

function scrapeImages(importedBy, datasetId) {
    return scheduleJob('scrapeImages', importedBy, datasetId);
}

function postImport(importedBy, datasetId) {
    return scheduleJob('postImport', importedBy, datasetId);
}

async function killJob(datasetId) {
    try {
        const dataset = await datasource_description.findById(datasetId, { jobId: 1 });

        if (dataset.jobId) {
            await new Promise((resolve, reject) => {
                kue.Job.get(dataset.jobId, (error, job) => {
                    if (error) {
                        return reject(error);
                    }

                    job.remove((error) => error ? reject(error) : resolve());
                });
            });

            dataset.jobId = 0;

            await dataset.save();
        }

        return { statusCode: 200, data: 'ok' };
    } catch (error) {
        return Promise.reject({ statusCode: 500, error });
    }
}

function getJobStatus(datasetId) {
    return new Promise((resolve, reject) => {
        datasource_description.findById(datasetId)
            .select({ jobId: 1 })
            .exec((err, queryingDataset) => {
                if (err) {
                    reject({ statusCode: 500, error: err });
                } else {
                    resolve({ statusCode: 200, data: { id: queryingDataset.jobId } });
                }
            });
    });
}

/**
 * @param {ObjectId} datasetId
 * @returns {Promise<Number>}
 */
async function startJob(datasetId) {
    const dataset = await datasource_description.findById(datasetId, 'jobId dirty');

    if (!dataset) {
        throw new RequestError('Dataset not found');
    }

    if (dataset.jobId) {
        return STATUS_NOT_MODIFIED;
    }

    const jobId = await saveHelpers.startJobIfNeeded(datasetId, dataset.dirty);

    if (!jobId) {
        throw new RequestError('Not dirty');
    }

    dataset.jobId = jobId;
    await dataset.save();

    return STATUS_OK;
}
