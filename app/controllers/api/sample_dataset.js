var winston = require('winston');
var Team = require('../../models/teams');
var datasource_description = require('../../models/descriptions');
var ObjectId = require('mongodb').ObjectID;
var datasource_file_service = require('../../libs/utils/aws-datasource-files-hosting');
const { copyDatasetAsset } = require('../../libs/utils/aws-image-hosting');


function _delegateDatasetDuplicationTasks(user, createdTeam, callback) {
    _getSampleDescriptionFromTeam(function (err, sampleDescription) {
        if (err) {
            callback(err);
        } else {
            // so many callbacks but it all needs to happen synchronously
            const { _id: sampleId, fileName: sampleFileName, banner } = sampleDescription;

            _getSampleDescriptionAndDuplicate(sampleId, user, createdTeam, function (err, duplicatedDoc) {
                if (err) {
                    callback(err);
                } else {
                    // update the new team with the duplicated dataset
                    _updateTeam(duplicatedDoc, createdTeam, function (err, savedTeam) {
                        if (err) {
                            callback(err);
                        } else {
                            // copy the csv file to new team's aws bucket
                            datasource_file_service.copySampleDatasource(sampleId, sampleFileName, duplicatedDoc.id, savedTeam.subdomain, function (err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    copyDatasetAsset({
                                        fromSubdomain: 'sampleteam',
                                        toSubdomain: savedTeam.subdomain,
                                        fromId: sampleId,
                                        toId: duplicatedDoc.id,
                                        source: 'assets/banner',
                                        fileName: banner,
                                    }, (err) => {
                                        if (err) {
                                            return callback(err);
                                        }
                                        callback(null);
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

module.exports.delegateDatasetDuplicationTasks = _delegateDatasetDuplicationTasks;

function _getSampleDescriptionFromTeam(callback) {
    Team.findOne({ title: 'sampleTeam' })
        .exec(function (err, sampleTeam) {
            if (err) {
                callback(err, null);
            } else {
                datasource_description.findOne({ _team: sampleTeam._id })
                    .exec(function (err, sampleDescription) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, sampleDescription);
                        }
                    });
            }
        });
}

function _getSampleDescriptionAndDuplicate(id, user, createdTeam, callback) {
    datasource_description.findById(id)
        .exec(function (err, dataset) {
            if (err) {
                callback(err, null);
            } else {
                // since these are all type Mixed, we need to set markModified to true
                var mixedFields = ['raw_rowObjects_coercionScheme', 'fe_excludeFields', 'fe_displayTitleOverrides', 'objectTitle', 'fe_objectShow_customHTMLOverrideFnsByColumnNames'];
                var duplicatedDescription = dataset;

                duplicatedDescription._id = ObjectId();
                // change the associated team
                duplicatedDescription._team = createdTeam._id;
                // change the associated author
                duplicatedDescription.author = user;
                // change dirty to 1
                duplicatedDescription.dirty = 1;
                // change firstImport to 1
                duplicatedDescription.firstImport = 1;
                // flag it as a sample so it can't be published to arrays.co
                duplicatedDescription.sample = true;
                // set imported to false so it doesn't try to load automatically when viewing website
                duplicatedDescription.imported = false;
                // don't allow publishing of sample dataset
                duplicatedDescription.fe_listed = false;
                duplicatedDescription.fe_visible = true;
                duplicatedDescription.isPublic = false;
                // set scraped image to false
                duplicatedDescription.fe_image.scraped = false;
                // loop through all the mixed fields and save to empty objects if they're not already set then mark modified so they save into db
                for (var i = 0; i < mixedFields.length; i++) {
                    if (!duplicatedDescription[mixedFields[i]]) {
                        winston.debug('field not set: ' + mixedFields[i]);
                        duplicatedDescription[mixedFields[i]] = {};
                    }
                    duplicatedDescription.markModified(mixedFields[i]);
                }
                // set to isNew so it saves as a new description in mongodb
                duplicatedDescription.isNew = true;
                duplicatedDescription.save(function (err, savedDescription) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, savedDescription);
                    }
                });
            }
        });
}

function _updateTeam(dataset, createdTeam, callback) {
    createdTeam.datasourceDescriptions.push(dataset.id);
    createdTeam.save(function (err, saved) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, saved);
        }
    });
}
