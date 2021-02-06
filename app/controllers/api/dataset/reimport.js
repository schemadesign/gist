const _ = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const async = require('async');
const Batch = require('batch');
const winston = require('winston');

const datasource_description = require('../../../models/descriptions');
const Team = require('../../../models/teams');
const User = require('../../../models/users');
const datatypes = require('../../../libs/datasources/datatypes');
const datasource_file_service = require('../../../libs/utils/aws-datasource-files-hosting');
const importedDataPreparation = require('../../../libs/datasources/imported_data_preparation');
const { PublicError } = require('../../../libs/system/errors');
const { copyDatasetAsset } = require('../../../libs/utils/aws-image-hosting');

const checkForContinutity = function (name, rowObjects) {
    return _.has(rowObjects, name);
};

const _mapColumnsOrErr = function (columns, rowObjectsFromCoercionScheme, replacement, callback) {
    const newColumnsLength = columns.length;
    const oldColumnsLength = _.size(rowObjectsFromCoercionScheme);

    if (replacement && newColumnsLength < oldColumnsLength) {
        return callback(new PublicError('Datasources are not compatible. Can\'t have fewer columns than previous datasource.'));
    }
    const difference = newColumnsLength - oldColumnsLength;

    let numberOfInconsistentColumns = 0;
    const rowObjects = [];
    for (let i = 0; i < columns.length; i++) {
        const columnName = columns[i].name;
        const sample = columns[i].sample;
        const sourceName = columns[i].sourceName;

        // the columns in raw row objects coercion scheme is in the opposite order
        if (replacement) {
            if (!checkForContinutity(columnName.replace(/U\+FF0E/g, '.'), rowObjectsFromCoercionScheme)) {
                numberOfInconsistentColumns++;
            }

            if (numberOfInconsistentColumns > difference || oldColumnsLength > newColumnsLength) {
                return callback(new PublicError('Datasources are not compatible'));
            }
        }

        const rowObject = datatypes.intuitDatatype(columnName, sample);

        rowObject.sourceName = sourceName;
        if (columns[i].createdField) {
            rowObject.createdField = columns[i].createdField;
            rowObject.operation = columns[i].operation;
            rowObject.data_type = columns[i].data_type;
        }
        rowObject.sourceType = 'spreadsheet';
        rowObjects.push(rowObject);
    }
    if (numberOfInconsistentColumns === 0 && replacement) {
        // if there are no column inconsistencies, there's no need to do any reimporting
        return callback(null, rowObjects, true);
    }
    // continuity = true;
    callback(null, rowObjects, false);
};
module.exports.mapColumnsOrErr = _mapColumnsOrErr;

const _addNewColumnsToFE_ExcludeFields = function (columns, fields) {
    for (let i = 0; i < columns.length; i++) {
        if (!checkForContinutity(columns[i].name, fields)) {
            fields[columns[i].name] = false;
        }
    }
    return fields;
};
module.exports.addNewColumnsToFE_ExcludeFields = _addNewColumnsToFE_ExcludeFields;

const _saveChildCopy = (parentId, childId) => new Promise((resolve, reject) => {
    datasource_description.findById(parentId, (err, replacedParent) => {
        if (err) {
            return reject(err);
        }

        if (!replacedParent) {
            return reject(new Error(`Could not find parent dataset with id ${parentId}`));
        }

        const replacedParentId = replacedParent.replaced_id;

        datasource_description.findById(childId, (err, originalChild) => {
            if (err) {
                return reject(err);
            }

            if (!originalChild) {
                return reject(new Error(`Could not find original child dataset with id ${childId}`));
            }

            const originalChildFileName = originalChild.fileName;
            originalChild.schema_id = replacedParentId;
            originalChild.save();

            // Make copy of child with new _id
            const copyOfChild = originalChild;
            copyOfChild._id = ObjectId();
            copyOfChild.schema_id = parentId;
            copyOfChild.replacement = true;
            copyOfChild.isNew = true;

            // Create it
            datasource_description.create(copyOfChild, (err, doc) => {
                if (err) {
                    winston.error(`Error when creating child copy of dataset, error: ${err}`);
                    return reject(new Error(`Error when creating child copy of dataset, error: ${err}`));
                }

                if (!doc) {
                    return reject(new Error('No child doc returned'));
                }

                resolve({ description: doc, originalChildFileName: originalChildFileName });
            });
        });
    });
});
module.exports.saveChildCopy = _saveChildCopy;

/**
 * TODO: assign and name the samller functions
 * Save the copy of datasource description.
 * Increments the revision
 * Adds the new description to the team
 * Updates any descriptions that are dependent on the copied one
 * Copies the ancillary file if it exists
 *
 * @param {DatasourceDescription_scheme} description
 * @param {int} user id
 */
const _saveCopy = (description, user) => new Promise((resolve, reject) => {
    // json parsing and stringifying allows deep clone
    const copyDescription = _.cloneDeep(description);
    copyDescription.replaced_id = description._id;
    copyDescription._id = ObjectId();
    copyDescription.replaced = false;
    copyDescription.replacement = true;
    copyDescription.createdAt = new Date();
    copyDescription.updatedAt = new Date();
    copyDescription.author = user;
    copyDescription.importRevision = description.importRevision + 1;
    copyDescription.uid = `${description.uid}-draft`;
    copyDescription.fe_image.scraped = false;

    if (!description._team) {
        return reject(new Error('No team for description '));
    }

    copyDescription._team = description._team._id;
    copyDescription.isNew = true;

    async.waterfall([
        function (callback) {
            datasource_description.create(copyDescription, function (err, doc) {
                if (err) {
                    return callback(err);
                }

                if (!doc) {
                    return callback(new Error('did not create copy doc'));
                }

                callback(null, doc);
            });
        },
        function (mainDataset, callback) {
            Team.findById(copyDescription._team, function (err, team) {
                if (err) {
                    return callback(err);
                }

                if (!team) {
                    return callback(new Error('cannot find team'));
                }

                team.datasourceDescriptions.push(mainDataset._id);
                team.save(function (err) {
                    callback(err, mainDataset);
                });
            });
        },
        function (mainDataset, callback) {
            datasource_description.update({ schema_id: copyDescription.replaced_id }, { schema_id: copyDescription._id }, function (err, response) {
                if (err) {
                    return callback(err);
                }

                callback(err, mainDataset);
            });
        },
        (mainDataset, callback) => {
            const { _team: team, replaced_id, _id: id, ancillaryFile } = mainDataset;
            if (mainDataset.ancillaryFile) {
                datasource_file_service.copyAncillaryFile(team.subdomain, replaced_id, id, ancillaryFile, err => {
                    callback(err, mainDataset);
                });
            } else {
                callback(null, mainDataset);
            }
        },
        (mainDataset, callback) => {
            datasource_description.findByIdAndUpdate(
                description._id, { replaced: true }, (err) => {
                    if (err) {
                        winston.error(`could not update dataset ${description._id}, error: ${err}`);
                        return callback(`could not update dataset ${description._id}, error: ${err}`);
                    }
                    callback(null, mainDataset);
                });
        },
        async (mainDataset, callback) => {
            const { _team: { subdomain: fromSubdomain }, _id: toId, replaced_id: fromId, banner: fileName } = mainDataset;
            const source = 'assets/banner';

            if (!fileName) {
                return callback(null, mainDataset);
            }

            copyDatasetAsset({ fromSubdomain, fromId, toId, source, fileName }, (err) => {
                if (err) {
                    winston.error('Error on copyDatasetAsset during reimport: ', err);
                    callback(null, mainDataset);
                }
                callback(null, mainDataset);
            });
        },
    ], function (err, dataset) {
        if (err) {
            return reject(err);
        }

        if (!dataset) {
            return reject(new Error('no dataset to return'));
        }

        resolve(dataset);
    });
});
module.exports.saveCopy = _saveCopy;

const copyChildElementUploadDataSource = (description, file, uploadToDataset, callback) => {
    datasource_description.findById(description._id)
        .populate('_team')
        .exec((err, descriptionWithTeam) => {
            if (err) {
                winston.error(`findById description with team error: ${err}`);
                return callback({ message: `findById description with team error: ${err}` });
            }
            if (!descriptionWithTeam) {
                winston.error('No parent description found');
                return callback({ message: 'No parent description found' });
            }
            description = descriptionWithTeam;
            description.fileName = file.originalname;

            datasource_file_service.uploadDataSource(
                file.path,
                file.originalname,
                file.mimetype,
                description._team.subdomain,
                uploadToDataset,
                (err) => {
                    if (err) {
                        winston.error(`Error during uploading the dataset into AWS : ${file.originalname} (${err.message})`);
                        return callback({ message: `Error during uploading the dataset into AWS : ${file.originalname} (${err.message})` });
                    }
                    callback();
                });
        });
};

const _copyChildElement = function (description, file, uploadToDataset, callback) {
    datasource_description.find({ schema_id: description._id }, function (err, childDoc) {
        if (err) {
            winston.error('err finding child document: ' + err);
            return callback(err);
        }

        // will need to adjust for multiple appended
        async.eachSeries(
            childDoc,
            ({ fileName }, next) => {
                datasource_file_service.copyDatasource(description._team.subdomain, fileName, description.replaced_id, description._id, (err) => {
                    next(err);
                });
            },
            (err) => {
                if (err) {
                    return callback(err);
                }
                copyChildElementUploadDataSource(description, file, uploadToDataset, callback);
            },
        );
    });
};
module.exports.copyChildElement = _copyChildElement;

/**
 * Removed reimport dataset
 *
 * @param {int} newId id of newly imported dataset
 * @param {int} oldId id of replaced dataset
 * @param {function} callback callback function
 */
const _removeReimportedDatasetAndReferences = function (newId, oldId, callback) {
    const batch = new Batch();
    batch.concurrency(1);

    batch.push(function (done) {
        // remove the child doc if it's been replaced or change it to reference the original dataset
        datasource_description.findOne({ schema_id: newId }, function (err, childDoc) {
            if (err) {
                return done(err);
            }
            if (childDoc) {
                if (childDoc.replacement) { // Remove replacement.
                    childDoc.remove(done);
                } else { // restore the reference of child dataset to the old id.
                    childDoc.schema_id = oldId;
                    childDoc.save(done);
                }
            } else {
                done();
            }
        });
    });

    batch.push(function (done) {
        // set the original dataset to replaced = false
        datasource_description.findByIdAndUpdate(oldId, { $set: { replaced: false } }, function (err) {
            if (err) {
                return done(err);
            }
            winston.debug('updated ' + oldId + ' set replaced=false');
            done();
        });
    });

    batch.end(function (err) {
        if (err) {
            winston.error('Error encountered when switching back dataset : ', err);
            return callback(err);
        }
        winston.info('Removed references to replacement dataset : ' + newId);
        callback(null);
    });
};
module.exports.removeReimportedDatasetAndReferences = _removeReimportedDatasetAndReferences;

module.exports.replaceReimportedDataset = function ({ user: userId, body: { newId, oldId } }, res) {
    if (!userId) {
        return res.status(401).send('Forbidden');
    }

    _removeReimportedDatasetAndReferences(newId, oldId, async (err) => {
        if (err) {
            winston.error('An error occurred while reimporting a dataset.', err);
            return res.status(500).send({ error: 'An error occurred while reimporting a dataset.' });
        }
        await User.updateMany({ _editors: newId }, { $set: { '_editors.$': oldId } });
        await User.updateMany({ _viewers: newId }, { $set: { '_viewers.$': oldId } });
        const user = await User.findById(userId);

        return res.status(200).send({ user });
    });
};

module.exports.publishNewDescription = function (req, res) {
    if (!req.body.oldId || !req.body.newId) {
        return res.status(500).json({ error: 'No ID given' });
    }

    const tasks = [];

    tasks.push((next) => {
        datasource_description.findById(req.body.newId, function (err, description) {
            if (err) {
                return next(err);
            }

            if (!description) {
                return next(new Error(`No datasource exists (2): ${req.body.newId}`));
            }

            description.replacement = false;
            description.uid = importedDataPreparation.DataSourceUIDFromTitle(description.title);
            description.previous_datasets.push(req.body.oldId);
            description.save(err => next(err));
        });
    });

    async.waterfall(tasks, (err) => {
        if (err) {
            winston.error(`Error encountered during publishNewDescription. error: ${err}`);
            return res.status(500).json({ error: 'An error occurred whole publishing new description.' });
        }
        return res.status(200).json({ success: true });
    });
};
