const jwt = require('jsonwebtoken');
const winston = require('winston');
const async = require('async');
const { has, isObject, isEmpty } = require('lodash');
const moment = require('moment');

const User = require('../../../models/users');
const Tokens = require('../../../models/tokens');
const Teams = require('../../../models/teams');
const ApiKey = require('../../../models/api_keys');
const mailer = require('../../../libs/utils/nodemailer');
const datasource_descriptions = require('../../../models/descriptions');
const Page = require('../../../models/pages');
const Website = require('../../../models/websites');
const inviteCode = require('../../../libs/utils/invitation-code-helpers');
const { userInvited } = require('./users.helpers');
const { handleError } = require('../../../utils/requests');
const { extractHostname } = require('../../../../shared/url');
const { validateObjectId, validateTeamAdmin } = require('../../../utils/validation');
const { UserError, RequestError } = require('../../../libs/system/errors');

module.exports.index = function (req, next) {
    const data = {
        env: process.env,
        flash: req.flash('message'),
        user: req.user,
    };

    next(null, data);
};

module.exports.search = function (req, res) {
    User.find(req.query)
        .select('-hash -salt')
        .populate('defaultLoginTeam')
        .lean()
        .exec((err, foundUsers) => {
            if (err) {
                winston.error(err);
                return res.json(false);
            }

            res.json(foundUsers);
        });
};

module.exports.searchEmail = function (req, res) {
    User.find(req.query)
        .populate('defaultLoginTeam')
        .lean()
        .exec((err, foundUsers) => {
            if (err) {
                winston.error(err);
                return res.json(false);
            }

            res.json(!!foundUsers.length);
        });
};

module.exports.checkPw = function (req, res) {
    const userId = req.params.id;

    User.findById(userId).exec((err, user) => {
        if (err) {
            winston.error(err);
            return res.json(false);
        }

        res.json({ valid: user.validPassword(req.body.password) });
    });
};

module.exports.getAll = (req, res) => {
    const teamId = req.params.teamId;

    User.find({ _team: teamId, _id: { $ne: req.user } }, '-hash -salt')
        .lean()
        .exec((err, allOtherUsers) => {
            if (err) {
                winston.error(err);
                return res.json(false);
            }

            res.json(allOtherUsers);
        });
};

const getCountOfDescriptions = (userId, callback) => {
    datasource_descriptions.estimatedDocumentCount({ author: userId }).exec((err, count) => {
        callback(err, userId, count);
    });
};

const findUserAndConstructObject = (userId, count, callback) => {
    User.findById(userId)
        .populate('_team defaultLoginTeam')
        .exec((err, user) => {
            if (err) {
                return callback(err);
            }
            if (!user) {
                return callback(new Error('session expired'));
            }

            const token = jwt.sign({ _id: user._id }, process.env.SESSION_SECRET);

            if (!user.defaultLoginTeam || user._team.length === 0) {
                return callback(new Error('unauthorized'));
            }

            const userInfo = {
                _id: user._id,
                provider: user.provider,
                email: user.email,
                _team: user._team,
                firstName: user.firstName,
                lastName: user.lastName,
                _editors: user._editors,
                _articleEditors: user._articleEditors,
                _siteEditors: user._siteEditors,
                _viewers: user._viewers,
                _articleViewers: user._articleViewers,
                _siteViewers: user._siteViewers,
                authToken: token,
                invited: user.invited,
                canCreateNewViz: user.canCreateNewViz,
                canCreateNewArticle: user.canCreateNewArticle,
                canCreateNewSite: user.canCreateNewSite,
                defaultLoginTeam: user.defaultLoginTeam,
                createdAt: user.createdAt,
                sampleImported: user.sampleImported,
                vizTotal: count,
                isSuperAdmin: user.isSuperAdmin(),
                hasSmartsheetToken: isObject(user.smartsheetToken),
                hasPipedriveToken: isObject(user.pipedriveToken),
                hasDatadotworldToken: isObject(user.datadotworldToken),
                hasSalesforceToken: isObject(user.salesforceToken),
            };

            callback(err, userInfo, user);
        });
};

/**
 * Check if a user is an editor of a given model
 * @param {array} teamCollection - an array of references to that team's articles, sites or datasourceDescriptions.
 * @param teamArticleCollection
 * @param {array} editors - an array of references to articles, sites or datasourceDescriptions that a given user is
 *     authorized edit.
 * @param articleEditors
 * @return {Boolean}
 */
const _checkIfUserIsEditor = (teamCollection, teamArticleCollection, editors, articleEditors) => {
    if (teamCollection && editors) {
        // cannot compare two mongo id objects without either turning into string or comparing with equals
        teamArticleCollection = teamArticleCollection.map(documentId => {
            return documentId.toString();
        });
        editors = editors.map(documentId => {
            return documentId.toString();
        });

        // See if there is an editor in pages
        if (articleEditors.some(documentId => teamArticleCollection.includes(documentId.toString()))) {
            return true;
        }

        // See if there is an editor in the datasetDescriptions
        if (teamCollection.some(documentId => editors.includes(documentId.toString()))) {
            return true;
        }
    }
    return false;
};
module.exports.checkIfUserIsEditor = _checkIfUserIsEditor;

const assignRole = (userInfo, user) => {
    if (user.role) {
        userInfo.role = user.role;
        return userInfo;
    }

    let role;
    let isEditor = false;

    if (user.isSuperAdmin()) {
        role = 'superAdmin';
    } else if (user.defaultLoginTeam.admin.some(id => id.toString() === user._id.toString())) {
        role = 'admin';
    } else {
        isEditor = _checkIfUserIsEditor(
            user.defaultLoginTeam.datasourceDescriptions,
            user.defaultLoginTeam.pages,
            user._editors,
            user._articleEditors,
        );
        if (user.canCreateNewArticle || user.canCreateNewViz || isEditor) {
            role = 'editor';
        } else {
            role = 'viewer';
        }
    }

    userInfo.role = role;
    return userInfo;
};

module.exports.get = function (req, res) {
    const id = req.params.id;
    if (id === 'currentUser') {
        if (!req.user) {
            return res.status(401).send({ error: 'session expired' });
        }
        const userId = req.user;

        async.waterfall(
            [async.apply(getCountOfDescriptions, userId), findUserAndConstructObject, async.asyncify(assignRole)],
            function (err, userInfo) {
                if (err) {
                    winston.error(err);
                    req.logout();
                    req.flash('error', {
                        message: 'Something went wrong when retrieving profile. Please try again later.',
                    });
                    return res.redirect('/auth/login');
                } else {
                    return res.status(200).json(userInfo);
                }
            },
        );
    } else {
        User.findById(id)
            .populate('_team defaultLoginTeam')
            .lean()
            .exec((err, user) => {
                if (err) {
                    res.send(err);
                } else {
                    user.team = user._team;
                    res.json(user);
                }
            });
    }
};

module.exports.getEmail = function (req, res) {
    const id = req.params.id;

    User.findById(id)
        // todo: populate only necessary fields!!!
        .populate('_team defaultLoginTeam')
        .lean()
        .exec((err, user) => {
            if (err) {
                return res.status(500).json({ error: 'An error occurred.' });
            }

            if (!user) {
                return res.status(400).json({ error: 'An error occurred.' });
            }

            res.json({
                email: user.email,
                _id: user._id,
                provider: user.provider,
                hash: !!user.hash,
                salt: !!user.salt,
                _team: user._team,
                defaultLoginTeam: user.defaultLoginTeam,
            });
        });
};

module.exports.create = function (req, res) {
    User.create(req.body, (err, user) => {
        if (err) {
            winston.error('An error occurred while creating user.', err);
            res.status(500).send({ error: 'An error occurred while creating user.' });
        } else {
            res.status(200).json(user);
        }
    });
};

module.exports.createWithToken = async (req, res) => {
    try {
        const { tokenId, password, _team: team, ...userData } = req.body;
        const schemaEmailRegexp = new RegExp('\\+superuser@schemadesign.com$');
        const isSuperUser = schemaEmailRegexp.test(userData.email);

        if (!isSuperUser) {
            try {
                const token = await Tokens.findById(tokenId);

                if (token.usedAt) {
                    return res.status(500).send({ error: 'This token has expired.', errorType: 'used' });
                }

                const { userId } = await jwt.verify(token.token, process.env.SESSION_SECRET);
                userData.inviter = userId;
                userData.inviteToken = token.id;
                userData.activated = true;
                userData.role = 'editor';
                token.usedAt = new Date();
                await token.save();
            } catch (e) {
                return res.status(500).send({ error: 'This token has expired.', errorType: 'expired' });
            }
        }

        const user = await User.create({
            ...userData,
            signedUp: true,
            provider: 'local',
        });

        user.setPassword(password);
        const newTeam = await Teams.create({
            admin: [user.id],
            ...team,
        });

        user._team = [newTeam.id];
        user.defaultLoginTeam = newTeam.id;

        await user.save();

        if (isSuperUser) {
            mailer.sendActivationEmail(user, () => {});
        }
        res.status(200).json(user);
    } catch (e) {
        res.status(500).send({ error: 'An error occurred while creating user.', errorType: 'creating' });
    }
};

//reset password
module.exports.reset = function (req, res) {
    User.findOne({ email: req.params.email })
        .populate('defaultLoginTeam')
        .lean()
        .exec((err, user) => {
            if (err) {
                return res.send(err);
            } else if (!user) {
                return res.status(404).json({ err: 'Cannot find User' });
            } else {
                mailer.sendResetPasswordEmail(user, err => {
                    if (err) {
                        winston.error('Cannot resend email to reset password.', err);
                        res.status(500).json({ error: 'Cannot resend email to reset password' });
                    } else {
                        res.json({ data: 'ok' });
                    }
                });
            }
        });
};

module.exports.resend = function (req, res) {
    const userId = req.params.id;
    if (!userId) {
        return res.status(401).send({ error: 'session expired' });
    }

    if (req.query.emailType === 'activation') {
        User.findById(userId, (err, user) => {
            if (err) {
                res.send(err);
            } else if (!user) {
                res.status(404).send('Cannot find User');
            } else {
                mailer.sendActivationEmail(user, err => {
                    if (err) {
                        winston.error('Cannot resend activation email', err);
                        res.status(500).send('Cannot resend activation email');
                    } else {
                        return res.redirect('/signup/success/' + userId);
                    }
                });
            }
        });
        return;
    }

    //resend invitation user
    const inviteeId = req.query.Invitee;

    if (!inviteeId) {
        return res.status(500).send('invalid parameter');
    }

    User.findById(userId)
        .populate('defaultLoginTeam')
        .exec((err, foundUser) => {
            if (err) {
                winston.error('An error occurred while resending invitee email.', err);
                return res.status(500).json({ error: 'An error occurred while resending invitee email.' });
            }

            if (!foundUser) {
                return res.status(401).json({ error: 'session expired' });
            }

            if (!has(foundUser.invited, inviteeId)) {
                return res.status(403).json({ error: 'Not authorized to resend invitation emails' });
            }

            User.findById(inviteeId, (err, invitee) => {
                if (err) {
                    return res.status(500).json({ error: 'An error occurred while finding invited user.' });
                }

                if (!invitee) {
                    return res
                        .status(401)
                        .json({ error: 'Could not find the new user, ensure they are on your team.' });
                }

                // Recreate the invite code
                const confirmation_code = inviteCode.generateRandomCode(3);

                invitee.confirmation_code_hash = {
                    hash: inviteCode.createHashWithString(confirmation_code),
                    expiration: moment()
                        .utc()
                        .add(1, 'd')
                        .format('x'),
                };

                invitee.tempCode = confirmation_code;
                mailer.sendInvitationEmail(false, foundUser.defaultLoginTeam, foundUser, invitee, err => {
                    if (err) {
                        winston.error('Cannot resend invitation email', err);
                        res.status(500).json({ error: 'Cannot resend invitation email' });
                    } else {
                        res.status(200).json(foundUser);
                    }
                });
            });
        });
};

module.exports.updateProfile = function (req, res) {
    const userId = req.params.id;

    User.findById(userId, (err, user) => {
        if (err) {
            return res.send(err);
        }

        for (let key in req.body) {
            if (key === 'password') {
                user.setPassword(req.body[key]);
            }
        }

        user.save(err => {
            if (err) {
                return res.send(err);
            } else {
                res.json(user);
            }
        });
    });
};

module.exports.update = function (req, res) {
    userInvited(req, (err, user) => {
        if (err) {
            return res.status(401).send(err.errmsg || err.message || err);
        } else {
            res.status(200).json(user);
        }
    });
};

module.exports.save = function (req, res) {
    if (!req.params.id) {
        return res.send(new Error('No Id given'));
    }

    User.findById(req.params.id, (err, user) => {
        if (err) {
            return res.send(err);
        }
        if (!user) {
            return res.send(new Error('No User Exists'));
        }

        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        user.active = req.body.active;
        user._editors = req.body._editors;
        user._viewers = req.body._viewers;
        user._articleEditors = req.body._articleEditors;
        user._articleViewers = req.body._articleViewers;
        user._siteEditors = req.body._siteEditors;
        user._siteViewers = req.body._siteViewers;
        user._team = req.body._team;
        user.canCreateNewViz = req.body.canCreateNewViz;
        user.canCreateNewArticle = req.body.canCreateNewArticle;
        user.canCreateNewSite = req.body.canCreateNewSite;

        if (req.body.defaultLoginTeam) {
            user.defaultLoginTeam = req.body.defaultLoginTeam;
        }
        user.save((err, savedUser) => {
            if (err) {
                res.send(err);
            } else {
                res.json(savedUser);
            }
        });
    });
};

module.exports.sampleImported = function (req, res) {
    User.findByIdAndUpdate(req.user, { $set: { sampleImported: req.body.sampleImported } }).exec((err, result) => {
        if (err) {
            return res.send(err);
        }
        return res.status(200).json(result);
    });
};

module.exports.defaultLoginTeam = function (req, res) {
    var teamId = req.params.teamId;
    if (!teamId) {
        return res.status(500).send(new Error('No teamId given'));
    }
    if (!req.user) {
        return res.status(401).send({ error: 'session expired' });
    } else {
        User.findByIdAndUpdate(req.user, { $set: { defaultLoginTeam: teamId } }).exec((err, result) => {
            if (err) {
                return res.send(err);
            }
            return res.status(200).json(result);
        });
    }
};

module.exports.delete = async (req, res) => {
    const userId = req.params.id;

    try {
        validateObjectId(userId);

        const currentUser = await User.findById(req.user)
            .select('_id defaultLoginTeam email superUser')
            .populate('defaultLoginTeam', 'admin')
            .lean()
            .exec();
        const teamToRemoveFrom = currentUser.defaultLoginTeam;
        const teamAdmin = teamToRemoveFrom.admin.some(id => id.toString() === req.user) ?
            req.user :
            teamToRemoveFrom.admin[0].toString();

        validateTeamAdmin(currentUser, teamToRemoveFrom);

        const userToRemove = await User.findById(userId)
            .populate(
                '_editors _viewers _articleEditors _articleViewers _siteEditors _siteViewers canCreateNewArticle canCreateNewViz canCreateNewSite',
            )
            .lean()
            .exec();

        if (!userToRemove) {
            return handleError(new RequestError('User doesn\'t exist'), res);
        }

        const teamId = teamToRemoveFrom._id.toString();

        if (!userToRemove._team.find(id => id.toString() === teamId)) {
            return handleError(new RequestError('Selected user isn\'t in the team'), res);
        }

        if (teamToRemoveFrom.admin.some(id => id.toString() === userId)) {
            return handleError(new UserError('Can\'t remove team admin'), res);
        }

        // Remove trace that user existed in the team
        await datasource_descriptions
            .updateMany({ author: userToRemove._id, _team: teamId }, { author: teamAdmin })
            .exec();
        await datasource_descriptions
            .updateMany({ updatedBy: userToRemove._id, _team: teamId }, { updatedBy: teamAdmin })
            .exec();
        await Page.updateMany({ createdBy: userToRemove._id, team: teamId }, { createdBy: teamAdmin }).exec();
        await Page.updateMany({ updatedBy: userToRemove._id, team: teamId }, { updatedBy: teamAdmin }).exec();
        await Website.updateMany({ createdBy: userToRemove._id, team: teamId }, { createdBy: teamAdmin }).exec();
        await Website.updateMany({ updatedBy: userToRemove._id, team: teamId }, { updatedBy: teamAdmin }).exec();

        if (userToRemove.activated) {
            // Only remove the user from the team, not from the db
            const teams = userToRemove._team.filter(id => id.toString() !== teamId);
            const editors = userToRemove._editors.filter(({ _team }) => _team.toString() !== teamId);
            const viewers = userToRemove._viewers.filter(({ _team }) => _team.toString() !== teamId);
            const articleEditors = userToRemove._articleEditors.filter(({ team }) => team.toString() !== teamId);
            const articleViewers = userToRemove._articleViewers.filter(({ team }) => team.toString() !== teamId);
            const siteEditors = userToRemove._siteEditors.filter(({ team }) => team.toString() !== teamId);
            const siteViewers = userToRemove._siteViewers.filter(({ team }) => team.toString() !== teamId);
            const canCreateNewViz = userToRemove.canCreateNewViz.filter(({ team }) => team.toString() !== teamId);
            const canCreateNewArticle = userToRemove.canCreateNewArticle.filter(
                ({ team }) => team.toString() !== teamId,
            );
            const canCreateNewSite = userToRemove.canCreateNewSite.filter(({ team }) => team.toString() !== teamId);

            await User.findByIdAndUpdate(userId, {
                _team: teams,
                _editors: editors,
                _viewers: viewers,
                _articleEditors: articleEditors,
                _articleViewers: articleViewers,
                _siteEditors: siteEditors,
                _siteViewers: siteViewers,
                canCreateNewViz,
                canCreateNewArticle,
                canCreateNewSite,
            }).exec();
        } else {
            // Removes user if is not activated
            await User.findByIdAndRemove(userId).exec();
        }

        winston.info(`Removed user ${userId} from Team ${teamId}`);
        res.sendStatus(204);
    } catch (err) {
        handleError(err, res);
    }
};

const validateToken = async token => {
    if (!token) {
        return false;
    }

    try {
        const a = await jwt.verify(token.token, process.env.SESSION_SECRET);
        winston.warn(a);
    } catch (jwtError) {
        winston.info(jwtError);
        return false;
    }

    return true;
};

module.exports.createAuthToken = async (req, res) => {
    try {
        const origin = req.get('origin');

        if (!origin) {
            return handleError(new UserError('Missing origin'), res);
        }

        const { key, token: previousToken } = req.body;

        if (!isEmpty(previousToken)) {
            const tokenItem = await Tokens.findOne({ token: previousToken });
            const isValidToken = await validateToken(tokenItem);

            if (isValidToken) {
                tokenItem.usedAt = new Date();

                await tokenItem.save();

                return res.json({ token: previousToken });
            } else if (tokenItem) {
                const apiKey = await ApiKey.findOne({ key, active: true });

                if (apiKey) {
                    await Tokens.deleteOne({ _id: tokenItem._id, apiKey: apiKey._id });

                    winston.info('Removed outdated token');
                }
            }
        }

        if (isEmpty(key)) {
            return handleError(new UserError('Missing api key'), res);
        }

        const apiKey = await ApiKey.findOne({ key, active: true }).populate('user');

        if (!apiKey) {
            return handleError(new UserError('Api key does not exist in db or is inactive'), res);
        }

        const isAuthorisedDomain = apiKey.requestDomains.some(domain => extractHostname(origin) === domain);

        if (!isAuthorisedDomain) {
            return handleError(new UserError('This domain is not authorised.'), res);
        }

        const token = jwt.sign({ userId: apiKey.user._id }, process.env.SESSION_SECRET, { expiresIn: '24h' });

        await Tokens.create({ token, apiKey: apiKey._id });

        res.json({ token });
    } catch (err) {
        handleError(err, res);
    }
};
