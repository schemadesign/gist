var kue = require('kue');
var winston = require('winston');

module.exports.getJob = function(req, res) {
    kue.Job.get(req.params.id, function (err, job) {
        if (err) {
            return res.status(500).json({ error: 'job doesn\'t exist' });
        }
        return res.status(200).json(job);
    });
};

module.exports.getJobState = function(req, res) {
    kue.Job.get(req.params.id, function (err, job) {
        if (err) {
            return res.status(500).json({ error: 'An error occurred while getting job state.' });
        }
        return res.status(200).json({ state: job.state() });
    });
};

module.exports.getJobLog = function(req, res) {
    kue.Job.log(req.params.id, function (err, log) {
        if (err) {
            winston.error(err);
        }
        return res.status(200).json(log);
    });
};
