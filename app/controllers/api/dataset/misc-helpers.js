const winston = require('winston');
const _ = require('lodash');
const async = require('async');

const datasource_description = require('../../../models/descriptions');
const reimport = require('./reimport');
const Users = require('../../../models/users');
const cached_values = require('../../../models/cached_values');
const datasource_file_service = require('../../../libs/utils/aws-datasource-files-hosting');
const func = require('../../client/func.js');
const saveHelpers = require('./save-helpers');

/**
 * Change the state of datasource description.
 *
 * @param {int|string} datasetId
 * @param {string} state
 */
const approvalRequest = (datasetId, state) => new Promise((resolve, reject) => {
    async.waterfall([
        (next) => {
            const queryArgs = {
                id: datasetId,
                populate: ['author', '_team'],
                returnMongoObject: true,
            };
            datasource_description.findByIdAndPopulateFields(queryArgs, next);
        },
        (dataset, next) => {
            dataset.state = _.isNil(state) ? undefined : state;
            dataset.save((err) => {
                if (err) {
                    return next(err);
                }

                if (dataset.state === 'pending') {
                    return;
                }

                if (['approved', 'disapproved'].includes(dataset.state) && !dataset.author.isSuperAdmin()) {
                    return;
                }

                return next(null, dataset);
            });
        },
    ], (err, dataset) => {
        if (err) {
            reject(err);
        } else {
            resolve(_.pick(dataset, ['state']));
        }
    });
});
module.exports.approvalRequest = approvalRequest;

/**
 *
 * @param {int|string} datasetId
 * @param {User} user
 */
const deleteBanner = (datasetId, user) => new Promise((resolve, reject) => {
    if (!user) {
        return reject(new Error('Not logged in'));
    }

    const queryArgs = {
        id: datasetId,
        populate: ['_team', 'subdomain'],
        returnMongoObject: true,
    };
    datasource_description.findByIdAndPopulateFields(queryArgs, (err, description) => {
        if (err || !_.get(description, 'banner')) {
            return reject(err);
        }

        let key;
        if (description.banner.indexOf('http') >= 0) {
            key = description.banner.split('amazonaws.com')[1];
        } else {
            key = `${description._team.subdomain}/datasets/${description._id}/assets/banner/${description.banner}`;
        }
        datasource_file_service.deleteObject(key, (err) => {
            if (err) {
                return reject(err);
            }

            description.banner = undefined;
            description.save((err) => {
                if (err) {
                    return reject(err);
                }

                resolve(description);
            });
        });
    });
});
module.exports.deleteBanner = deleteBanner;

/**
 * Field values for color mapping
 *
 * @param {int} datasetId
 * @param {string} field
 */
const getCachedValues = (datasetId, field) => new Promise((resolve, reject) => {
    cached_values.findOne({ srcDocPKey: datasetId }, (err, doc) => {
        if (err) {
            winston.error(err);
            return reject(err);
        }

        if (!doc) {
            return reject(new Error('No dataset found in cache'));
        }

        datasource_description.findById(datasetId).exec((err, dataset) => {
            if (err) {
                winston.error(err);
                return reject(err);
            }

            let formattedValues = [];
            _.forEach(doc.limitedUniqValsByColName[field], (value) => {
                formattedValues.push(func.formatCoercedField(field, value, dataset));
            });
            resolve(formattedValues);
        });
    });
});
module.exports.getCachedValues = getCachedValues;

const revert = (toCopyId, currentId, user) => new Promise((resolve, reject) => {
    const args = {};

    async.waterfall([
        // find the current dataset
        callback => {
            winston.debug('getting the current exposed dataset');
            datasource_description.findById(currentId, { importRevision: 1, previous_datasets: 1 })
                .exec((err, currentDataset) => {
                    args.currentDataset = currentDataset;
                    callback(err, args);
                });
        },

        // find the dataset to be copied for reverting
        (args, callback) => {
            winston.debug('finding the dataset to be copied/reverted');
            datasource_description.findById(toCopyId)
                .populate('_team')
                .exec((err, datasetToCopy) => {
                    args.datasetToCopy = datasetToCopy;
                    callback(err, args);
                });
        },

        // save a copy
        (args, callback) => {
            winston.debug('creating copy of dataset');
            reimport.saveCopy(args.datasetToCopy, user)
                .then(newDescription => {
                    if (!newDescription) {
                        winston.error('Description was not copied when reverting');
                        return callback(new Error('Description was not copied when reverting'));
                    }

                    args.newDescription = newDescription;
                    callback(null, args);
                })
                .catch(callback);
        },

        // change and save some fields that are unique to reverting
        (args, callback) => {
            winston.debug('updating new dataset fields');

            // update the import revision of the copy to be one more than that of the current dataset
            args.newDescription.importRevision = args.currentDataset.importRevision + 1;
            args.newDescription.uid = args.datasetToCopy.uid;

            // set image scraped to false so scraping triggers on import process
            args.newDescription.fe_image.scraped = false;

            // imported to false and dirty to 1 to trigger import process
            args.newDescription.imported = false;
            args.newDescription.dirty = 1;
            args.newDescription.replaced = false;
            args.newDescription.tabDestination = 1;

            // set replacement to false since that's only for reimported datasets
            args.newDescription.replacement = false;
            args.newDescription.replaced_id = null;

            // copy previous datasets plus the last dataset
            args.newDescription.previous_datasets = args.currentDataset.previous_datasets;
            args.newDescription.previous_datasets.push(args.currentDataset._id);

            args.newDescription.save((err, updatedCopy) => {
                args.newDescription = updatedCopy;
                callback(err, args);
            });
        },

        // copy the csv file to new description id folder
        (args, callback) => {
            winston.debug('copying file source from s3');
            const { datasetToCopy: toCopy, newDescription } = args;
            datasource_file_service.copyDatasource(toCopy._team.subdomain, toCopy.fileName, toCopyId, newDescription._id, (err) => {
                callback(err, args);
            });
        },

        // start a job
        async (args, callback) => {
            winston.debug('starting a job for new dataset');

            const jobId = await saveHelpers.startJobIfNeeded(args.newDescription._id, args.newDescription.dirty);

            if (!jobId) {
                return callback(null, args);
            }

            args.newDescription.jobId = jobId;

            args.newDescription.save((err, updatedCopy) => {
                args.newDescription = updatedCopy;
                callback(err, args);
            });
        },

        // set replaced to be true if not already for the dataset that was copied/reverted
        (args, callback) => {
            winston.debug('setting replaced to true in copied dataset if not already set');
            if (args.datasetToCopy.replaced === true) {
                callback(null, args);
            } else {
                args.datasetToCopy.replaced = true;
                args.datasetToCopy.save(err => callback(err, args));
            }
        },

        // set replaced to be true if not already for the current dataset
        (args, callback) => {
            winston.debug('setting replaced to true in current dataset if not already set');
            if (args.currentDataset.replaced === true) {
                callback(null, args);
            } else {
                args.currentDataset.replaced = true;
                args.currentDataset.save(err => callback(err, args));
            }
        },

        // give any users that had viewing access to the current dataset, viewing access to the new one
        (args, callback) => {
            winston.debug('updating any viewer users');
            Users.update({ _viewers: args.currentDataset._id }, { $push: { _viewers: args.newDescription._id } })
                .exec(err => callback(err, args));
        },

        // give any users that had editing access to the current dataset, editing access to the new one
        (args, callback) => {
            winston.debug('updating any editor users');
            Users.update({ _editors: args.currentDataset._id }, { $push: { _editors: args.newDescription._id } })
                .exec(err => callback(err, args));
        },
    ], (err, args) => {
        if (err) {
            winston.error('Something went wrong when reverting');
            return reject(err);
        }

        resolve(_.pick(args.newDescription, '_id'));
    });
});
module.exports.revert = revert;
