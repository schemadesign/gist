const winston = require('winston');
const async = require('async');
const { isNil, isEqual } = require('lodash');
const Batch = require('batch');
const Team = require('../../models/teams');
const User = require('../../models/users');
const s3ImageHosting = require('../../libs/utils/aws-image-hosting');
const datasource_file_service = require('../../libs/utils/aws-datasource-files-hosting');
const datasource_description = require('../../models/descriptions');
const s3FileHosting = require('../../libs/utils/aws-datasource-files-hosting');
const sample_dataset = require('./sample_dataset');
const { handleError } = require('../../utils/requests');
const { validateObjectId, validateTeamAdmin } = require('../../utils/validation');
const { RequestError, UserError } = require('../../libs/system/errors');

const ALLOWED_FILE_TYPES = /text\/plain|image\/bmp|image\/gif|image\/jpeg|image\/png|image\/svg\+xml|image\/svg xml\/application|pdf/gm;

const checkUser = next => {
    return function (req, res) {
        if (!req.user) {
            return res.status(401).send({ error: 'session expired' });
        }
        return next(req, res);
    };
};

module.exports.getAll = function (req, res) {
    Team.find({})
        .populate({
            path: 'datasourceDescriptions',
            select: { uid: 1, title: 1, replaced: 1, master_id: 1, schema_id: 1, updatedAt: 1 },
        })
        .sort({ title: 1 })
        .exec(function (err, teams) {
            if (err) {
                winston.error(err);
                res.send({ error: err.message });
            } else {
                res.status(200).json(teams);
            }
        });
};

module.exports.create = checkUser((req, res) => {
    Team.create(req.body, (err, createdTeam) => {
        if (err) {
            res.send({ error: err.message });
        } else {

            User.findById(req.user, (err, user) => {
                if (err) {
                    res.send({ error: err.message });
                } else {
                    user._team.push(createdTeam._id);
                    user.save();

                    // this will be a pain to have in dev if ever someone wants to wipe their local db, setting to
                    // production only for now also, if we're creating sampleTeam for the first time
                    if (createdTeam.title !== 'sampleTeam' && (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging')) {
                        return sample_dataset.delegateDatasetDuplicationTasks(req.user, createdTeam, err => {
                            if (err) {
                                res.send({ error: err });
                            } else {
                                createdTeam.notifyNewTeamCreation();
                                res.json(createdTeam);
                            }
                        });
                    }

                    createdTeam.notifyNewTeamCreation();
                    res.json(createdTeam);
                }
            });
        }
    });
});

module.exports.search = function (req, res) {
    Team.find(req.query, (err, foundTeams) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.status(200).json(foundTeams);
    });
};

module.exports.update = checkUser((req, res) => {
    Team.findByIdAndUpdate(req.params.id)
        .exec((err, team) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (!team) {
                return res.status(404).json({ error: 'Team not found.' });
            }

            for (let attr in req.body) {
                team[attr] = req.body[attr];
            }
            team.save(err => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                return res.json({ team });
            });
        });
});

module.exports.signedUrlForAssetsUpload = checkUser((req, res) => {
    if (!req.query.fileType.match(ALLOWED_FILE_TYPES)) {
        return res.status(406).send({ error: 'Invalid file format' });
    }

    Team.findById(req.params.id)
        .exec((err, team) => {
            let key;
            if (req.query.assetType === 'logo' || req.query.assetType === 'logo_header') {
                key = team.subdomain + '/assets/logo/' + req.query.fileName;
            } else {
                key = team.subdomain + '/assets/' + req.query.assetType + '/' + req.query.fileName;
            }

            s3ImageHosting.signedUrlForPutObject(key, req.query.fileType, (err, data) => {
                if (err) {
                    return res.status(500).send({ error: err.message });
                } else {
                    return res.json({ putUrl: data.putSignedUrl, publicUrl: data.publicUrl });
                }
            });
        });
});

module.exports.loadIcons = checkUser((req, res) => {

    User.findById(req.user)
        .populate('defaultLoginTeam')
        .exec((err, user) => {
            if (err) {
                res.status(500).send({ error: err.message });
            } else {

                s3ImageHosting.getAllIconsForTeam(user.defaultLoginTeam.subdomain, (err, data) => {
                    if (err) {
                        res.status(500).send({ error: err.message });
                    } else {
                        res.json({ iconsUrl: data });
                    }
                });

            }
        });

});

module.exports.delete = checkUser((req, res) => {

    let batch = new Batch();
    batch.concurrency(1);

    let teamToDelete;
    let unauthorized = false;

    batch.push(done => {

        Team.findById(req.params.id, (err, team) => {
            if (err) {
                done(err);
            } else {
                teamToDelete = team;
                // if (team.admin == req.user) done(); //comment out, can team admin delete team?
                batch.push(done => {

                    User.findById(req.user, (err, user) => {
                        if (err) {
                            done(err);
                        } else {
                            if (user.isSuperAdmin() || user.superUser) {
                                done();
                            } else {
                                // todo: does it even work?
                                unauthorized = true;
                                done();
                            }
                        }
                    });

                });
                done();
            }
        });
    });

    batch.push(done => {
        if (!unauthorized) {
            datasource_description.find({ _team: teamToDelete._id }, (err, datasets) => {
                if (err) {
                    done(err);
                } else {

                    datasets.forEach(dataset => {
                        dataset.remove();
                    });

                    done();
                }
            });
        } else {
            done();
        }
    });

    batch.push(done => {
        // todo: even if user is unauthorised?
        datasource_file_service.deleteTeam(teamToDelete.subdomain, done);
    });

    batch.push(done => {
        if (!unauthorized) {
            User.find({ _team: teamToDelete._id }, (err, allusers) => {
                if (err) {
                    done(err);
                } else {

                    if (allusers) {

                        allusers.forEach(user => {
                            const index = user._team.indexOf(teamToDelete._id);
                            if (index >= 0) {
                                user._team.splice(index, 1);
                                if (user.defaultLoginTeam === teamToDelete._id.toString()) {
                                    user.defaultLoginTeam = null;
                                    if (user._team.length === 0) {
                                        user.defaultLoginTeam = null;
                                    } else {
                                        user.defaultLoginTeam = user._team[0];
                                    }
                                }
                                user.markModified('defaultLoginTeam');
                                user.markModified('_team');
                                user.save();
                            }
                        });

                        done();
                    } else {
                        done();
                    }
                }
            });
        } else {
            done();
        }
    });

    batch.push(done => {
        // todo: unauthorised?
        teamToDelete.remove(done);
    });

    batch.end(err => {
        if (err) {
            winston.error(err);
            return res.status(500).send(err);
        }
        if (unauthorized) {
            res.status(401).send({ error: 'unauthorized' });
        } else {
            return res.json({ message: 'ok' });
        }
    });
});

module.exports.deleteImage = checkUser((req, res) => {
    // only the admin or super admin can change images
    User.findById(req.user, (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!user.isSuperAdmin() && !user._team.some(team => isEqual(team.toString(), req.params.id))) {
            return res.status(401).json({ error: 'unauthorized' });
        }

        Team.findOne({ _id: req.params.id }, (err, teamDoc) => {
            if (err) {
                return res.status(500).send(err.message);
            } else {
                const key = teamDoc.subdomain + '/assets/' + req.params.folder + '/' + req.params.filename;
                // delete the key from s3
                s3FileHosting.deleteObject(key, (err, data) => {
                    if (err) {
                        res.status(500).send({ error: err.message });
                    } else {

                        // if the url is in the database
                        if (req.params.folder === 'logo_header') {
                            teamDoc.logo_header = undefined;
                        } else if (req.params.folder === 'logo') {
                            teamDoc.logo = undefined;
                        } else {
                            return res.json({ message: 'ok' });
                        }
                        teamDoc.save();
                        return res.json({ doc: teamDoc });
                    }
                });
            }
        });
    });
});

module.exports.addAdmin = checkUser(async (req, res) => {
    const newAdminId = req.params.id;

    try {
        validateObjectId(newAdminId);

        const user = await User.findById(req.user)
            .select('_id defaultLoginTeam email superUser')
            .populate('defaultLoginTeam', 'admin')
            .lean()
            .exec();
        const team = user.defaultLoginTeam;
        const teamId = team._id.toString();

        validateTeamAdmin(user, team);

        const newAdmin = await User.findById(newAdminId)
            .select('_id _team')
            .lean()
            .exec();

        if (!newAdmin) {
            return handleError(new RequestError('User doesn\'t exist'), res);
        }

        if (!newAdmin._team.some(id => id.toString() === teamId)) {
            return handleError(new RequestError('User doesn\'t belong to the team'), res);
        }

        const admin = team.admin.concat(newAdmin._id);

        if (team.admin.some(id => id.toString() === newAdminId)) {
            return handleError(new RequestError('User is already an admin'), res);
        }

        await Team.findOneAndUpdate({ _id: teamId }, { admin }).exec();

        res.sendStatus(204);
    } catch (err) {
        handleError(err, res);
    }
});

module.exports.deleteAdmin = checkUser(async (req, res) => {
    const adminId = req.params.id;

    try {
        validateObjectId(adminId);

        const user = await User.findById(req.user)
            .select('_id defaultLoginTeam email superUser')
            .populate('defaultLoginTeam', 'admin')
            .lean()
            .exec();
        const team = user.defaultLoginTeam;

        validateTeamAdmin(user, team);

        const adminToRemove = await User.findById(adminId)
            .select('_id')
            .lean()
            .exec();

        if (!adminToRemove) {
            return handleError(new RequestError('User doesn\'t exist'), res);
        }

        if (!team.admin.some(id => id.toString() === adminId)) {
            return handleError(new RequestError('User isn\'t an admin'), res);
        }

        if (team.admin.length === 1) {
            return handleError(new UserError('Team needs to have at least one admin'), res);
        }

        const admin = team.admin.filter(id => id.toString() !== adminId);

        await Team.findOneAndUpdate({ _id: team._id }, { admin }).exec();

        res.sendStatus(204);
    } catch (err) {
        handleError(err, res);
    }
});

const getTeamBySubdomain = async ({ user: userId, subdomains: [subdomain], query: { vizName } }) => {
    let user = null;

    if ((isNil(subdomain) || subdomain === '') && !process.env.SUBDOMAIN) {
        return null;
    }

    if (userId) {
        user = await User.findById(userId).populate('_team');
    }

    return await Team.getTeamEntries(subdomain, user, vizName);
};

// team page
module.exports.getTeamBySubdomain = async.asyncify(getTeamBySubdomain);
