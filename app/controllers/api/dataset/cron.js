const CronModel = require('../../../models/crons');
const cluster = require('cluster');

const async = require('async');
const cronHelper = require('../../../boot/cron-init');


module.exports = {
    save: function (req, res) {
        async.waterfall([
            function (next) {
                if (req.body._id) {
                    CronModel.findByIdAndUpdate(req.body._id, { $set: { time: req.body.cronTime } }, { new: true })
                        .exec(function (err, updated) {

                            next(err, updated);
                        });

                } else {
                    const body = {
                        time: req.body.cronTime,
                        datasourceDescription: req.body.datasetId,
                        scheduledBy: req.user,
                        updatedBy: req.user,
                        status: 'running',
                    };

                    CronModel.create(body, function (err, newCronEntry) {
                        next(err, newCronEntry);
                    });
                }
            },
            function (cronEntry, next) {
                if (!cronEntry) {
                    next(new Error('Cron Entry not saved to database'));
                } else {

                    if (cluster.isMaster) {
                        cronHelper.execute('resume', cronEntry._id);

                    } else {

                        process.send({ command: 'resume', id: cronEntry._id });
                    }

                    next(null, cronEntry);
                }
            },
        ], function (err, cronEntry) {
            if (err) {
                return res.status(500).send({ error: 'An error occurred while scheduling a task.' });
            }
            return res.status(200).json(cronEntry);
        });
    },
    get: function (req, res) {

        const datasetId = req.params.datasetId;

        CronModel.findOne({ datasourceDescription: datasetId }, function (err, job) {

            if (err) {
                return res.status(500).send({ error: 'An error occurred while getting a task.' });
            }
            return res.status(200).json(job);

        });
    },

    update: function (req, res) {
        const cronId = req.params.id;
        const command = req.body.command; // 'resume' && 'pause'
        const act = (command === 'pause') ? 'pause' : 'running';

        CronModel.findByIdAndUpdate(cronId, {
            $set: {
                status: act,
                time: req.body.cronTime,
            },
        }, { new: true }, function (err, job) {
            console.warn('job:', job);
            if (err) {
                return res.status(500).send({ error: 'An error occurred while finding a task.' });
            }

            if (cluster.isMaster) {
                cronHelper.execute(command, cronId, function (err, job) {
                    if (err) {
                        return res.status(500).send({ error: 'An error occurred while updating a task.' });
                    }

                    return res.status(200).json(job);
                });
            } else {
                process.send({ command: command, id: cronId });
                return res.status(200).json(job);
            }
        });
    },

    delete: function (req, res) {
        const cronId = req.params.id;

        CronModel.findByIdAndDelete(cronId, (err, job) => {
            if (err) {
                return res.status(500).send({ error: 'An error occurred while removing a task.' });
            }

            return res.status(200).json(job);
        });
    },
};


