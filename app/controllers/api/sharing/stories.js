const { isEmpty } = require('lodash');
const Batch = require('batch');
const winston = require('winston');

const s3FileHosting = require('../../../libs/utils/aws-datasource-files-hosting');
const processScreenshot = require('../../../libs/import/process-screenshot');
const User = require('../../../models/users');
const Story = require('../../../models/stories');
const queue = require('../../../boot/queue-init');

module.exports.getAll = function (req, res) {
    User.findById(req.user)
        .populate('defaultLoginTeam')
        .exec(function (err, user) {
            if (err || !user) {
                return res.status(401).send('unauthorized');
            } else {
                var batch = new Batch();
                batch.concurrency(2);
                var stories = [];

                batch.push(function (done) {
                    Story.find({ createdBy: user._id }, 'createdAt createdBy _id title datasourceDescription') //find all stories this user is author
                        .deepPopulate('datasourceDescription._team', {
                            populate: {
                                'datasourceDescription._team': { select: 'title _id subdomain' },
                                datasourceDescription: { select: 'title _id _team' }
                            }
                        })
                        .populate({
                            path: 'createdBy',
                            select: 'firstName lastName _id'
                        })
                        .populate('sharedPages')
                        .exec(function (err, storiesThatUserIsAuthor) {
                            if (err) {
                                return done(err);
                            }
                            stories = stories.concat(storiesThatUserIsAuthor);
                            done();
                        });
                });

                batch.push(function (done) {

                    if (user.isSuperAdmin() || user.defaultLoginTeam.admin.some(id => id.toString() === user._id.toString())) {

                        Story.aggregate([
                            {
                                $lookup: {
                                    from: 'datasourcedescriptions',
                                    localField: 'datasourceDescription',
                                    foreignField: '_id',
                                    as: 'datasourceDescription'
                                }
                            },
                            { $unwind: '$datasourceDescription' },
                            {
                                $match: {
                                    'datasourceDescription._team': user.defaultLoginTeam._id,
                                    createdBy: { $ne: user._id }
                                }
                            },
                            {
                                $lookup: {
                                    from: 'teams',
                                    localField: 'datasourceDescription._team',
                                    foreignField: '_id',
                                    as: 'datasourceDescription._team'
                                }
                            },
                            { $unwind: '$datasourceDescription._team' },
                            {
                                $lookup: {
                                    from: 'users',
                                    localField: 'createdBy',
                                    foreignField: '_id',
                                    as: 'createdBy'
                                }
                            },
                            { $unwind: '$sharedPages' },
                            {
                                $lookup: {
                                    from: 'sharedpages',
                                    localField: 'sharedPages',
                                    foreignField: '_id',
                                    as: 'sharedPages',
                                },
                            },
                            { $unwind: '$createdBy' },
                            {
                                $project: {
                                    _id: 1,
                                    title: 1,
                                    createdAt: 1,
                                    'createdBy.firstName': 1,
                                    'createdBy.lastName': 1,
                                    'createdBy._id': 1,
                                    'datasourceDescription._team._id': 1,
                                    'datasourceDescription._team.title': 1,
                                    'datasourceDescription._team.subdomain': 1,
                                    'datasourceDescription.title': 1,
                                    'datasourceDescription._id': 1,
                                    'sharedPages.imageUrl': 1,
                                }
                            },
                        ], function (err, aggs) {
                            if (err) {
                                return done(err);
                            }
                            stories = stories.concat(aggs);
                            done();
                        });

                    } else {
                        done();
                    }
                });

                batch.end(function (err) {
                    if (err) {
                        winston.error('Cannot get stories', err);
                        return res.status(500).send('Cannot get stories');
                    }
                    res.status(200).json(stories);
                });
            }
        });

};

module.exports.get = function (req, res) {
    var story_id = req.params.id;
    if (!story_id) {
        return res.status(500).json({ error: 'Invalid parameter' });
    }

    Story.findById(story_id)
        .deepPopulate('createdBy datasourceDescription datasourceDescription._team sharedPages')
        .exec(function (err, story) {
            if (err) {
                winston.error('An error occurred while getting the story.', err);
                return res.status(500).send({ error: 'An error occurred while getting the story.' });
            }
            res.status(200).json(story);
        });
};


module.exports.getByDataSourceDescriptionId = function (req, res) {
    const dataSourceDescriptionId = req.params.id;
    if (!dataSourceDescriptionId) {
        return res.status(500).json({ error: 'Invalid parameter' });
    }

    const findQuery = {
        $and: [
            { datasourceDescription: dataSourceDescriptionId },
            {
                $or: [
                    { isPublic: true },
                    { isPublic: { $exists: false } },
                ],
            },
        ],
    };

    Story.find(findQuery)
        .select('title sharedPages')
        .populate({ path: 'sharedPages', select: 'imageUrl' })
        .exec(function (err, stories) {
            if (err) {
                winston.error('An error occurred while getting the stories.', err);
                return res.status(500).send({ error: 'An error occurred while getting the stories.' });
            }
            res.status(200).json(stories);
        });
}

module.exports.remove = function (req, res) {

    if (!req.params.id) {
        return res.status(500).json({ error: 'Invalid parameter' });
    }
    var batch = new Batch();
    batch.concurrency(1);
    var s3Key;
    var story;

    batch.push(function (done) {
        Story.findById(req.params.id)
            .deepPopulate('datasourceDescription datasourceDescription._team')
            .exec(function (err, doc) {
                if (err) {
                    return done(err);
                }
                s3Key = doc.datasourceDescription._team.subdomain + '/datasets/' + doc.datasourceDescription._id + '/stories/' +
                    doc._id;
                story = doc;
                done();
            });


    });
    batch.push(function (done) {

        s3FileHosting.deleteObject(s3Key, function (err, data) {
            if (err) {
                return done(err);
            }
            done();
        });
    });

    batch.push(function (done) {
        story.remove(done);

    });

    batch.end(function (err) {

        if (err) {
            winston.error('An error occurred while removing the story.', err);
            return res.status(500).json({ error: 'An error occurred while removing the story.' });
        }
        return res.status(200).send({});
    });

};

module.exports.save = function (req, res) {
    Story.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true })
        .deepPopulate('datasourceDescription datasourceDescription._team')
        .exec(function (err, story) {
            if (err) {
                winston.error(err);
                return res.status(500).json({ error: 'An error occurred while saving the story.' });
            }
            res.status(200).json(story);
        });
};

/**
 * Controller for POST method on /story route
 * @param {Object} req - Express request object, req.body contains story data
 * @param {Object} res - Express response object
 */
module.exports.postStory = async function (req, res) {
    const { user, body } = req;

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isEmpty(body.sharedPages)) {
        return res.status(400).json({ error: 'At least one shared page must be provided' });
    }

    queue.scheduleJob('processStory', { ...body, user }, (err, job) => {
        if (err) {
            winston.error('An error occurred while posting the story.', err);
            return res.status(500).send({ error: 'An error occurred while posting the story.' });
        }

        return res.json({ jobId: job.id });
    });
};

module.exports.postBuildScreenshot = async function (req, res) {
    const { body } = req;

    if (isEmpty(body.url)) {
        return res.status(400).json({ error: 'At least url must be provided' });
    }

   await processScreenshot(body, res);
};

