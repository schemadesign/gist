// Module Imports
const mailer = require('../../libs/utils/nodemailer');
const Team = require('../../models/teams');
const User = require('../../models/users');
const winston = require('winston');
const inviteCode = require('../../libs/utils/invitation-code-helpers');
const moment = require('moment');

/**
 * Invite user to a team helper function.
 * Determines if we're inviting a new user, and then proceeds to create a new user with the permissions that are passed.
 * Ends by sending an invitation email to the new user.
 *
 * If we're inviting an existing user then we update the User, Team, and then send them a welcome email.
 * No more steps are needed after this.
 * @param {*} req
 * @param {*} res
 */
module.exports.invite = (req, res) => {
    // Find the user that's inviting the new user
    User.findById(req.user)
        .populate('defaultLoginTeam')
        .exec((err, foundUser) => {
            if (err) {
                // Couldn't find the inviter user by id
                winston.error('Find by id error', err);
                return res.status(500).send({ error: 'An error occurred while finding invited user.' });
            }
            // Make sure the user requesting these changes has admin status
            if (foundUser.isSuperAdmin() || foundUser.superUser || foundUser.defaultLoginTeam.admin.some(id => id.toString() === req.user)) {

                if (!foundUser.invited) {
                    foundUser.invited = {};
                }
                let invitedUser;
                // Add a confirmation code field to the new user
                const confirmation_code = inviteCode.generateRandomCode(3);

                // If we have a new user build the new user object
                if (!req.body._id) { //invite is only for new user
                    const new_user = {
                        email: req.body.email,
                        _team: req.body._team,
                        defaultLoginTeam: req.body.defaultLoginTeam,
                        canCreateNewViz: req.body.canCreateNewViz,
                        canCreateNewArticle: req.body.canCreateNewArticle,
                        canCreateNewSite: req.body.canCreateNewSite,
                        _editors: req.body._editors || [],
                        _viewers: req.body._viewers || [],
                        _articleEditors: req.body._articleEditors || [],
                        _articleViewers: req.body._articleViewers || [],
                        _siteEditors: req.body._siteEditors || [],
                        _siteViewers: req.body._siteViewers || [],
                        invitedBy: foundUser,
                        confirmation_code_hash: {
                            hash: inviteCode.createHashWithString(confirmation_code),
                            expiration: moment().utc().add(1, 'd').format('x'),
                        },
                    };

                    if (process.env.AUTH_PROTOCOL === 'LDAP') {
                        new_user.provider = 'ldap';
                    } else {
                        new_user.provider = 'local';
                    }

                    User.create(new_user, (err, createdUser) => {
                        if (err) {
                            // Log the error with the request and createdUser information
                            winston.error(err, createdUser);
                            res.status(500).send({ error: 'An error occurred while creating user.' });
                        } else {
                            invitedUser = createdUser._id;

                            foundUser.invited[invitedUser] = {
                                _editors: req.body._editors,
                                _viewers: req.body._viewers,
                                _articleEditors: req.body._articleEditors,
                                _articleViewers: req.body._articleViewers,
                                _siteViewers: req.body._siteViewers,
                                _siteEditors: req.body._siteEditors,
                            };

                            foundUser.markModified('invited');

                            foundUser.save(err => {
                                if (err) {
                                    winston.error(err);
                                    res.status(500).send({ error: 'An error occurred while saving a new user.' });
                                } else {
                                    Team.findById(req.body._team[0], (err, team) => {
                                        if (err) {
                                            winston.error(err);
                                            res.status(500).send(err);
                                        } else {
                                            // Pass the confirmation_code
                                            createdUser.tempCode = confirmation_code;
                                            mailer.sendInvitationEmail(false, team, foundUser, createdUser,
                                                err => {
                                                    if (err) {
                                                        return res.status(200).send({
                                                            error: 'An error occurred while sending invitation email on create user.',
                                                            user: foundUser,
                                                            invitedUser: createdUser,
                                                        });
                                                    }

                                                    return res.status(200).send({
                                                        user: foundUser, invitedUser: createdUser,
                                                    });
                                                });
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    const findQuery = {
                        _id: req.body._id,
                    };
                    const updateQuery = {
                        $set: {
                            _editors: req.body._editors,
                            _viewers: req.body._viewers,
                            _team: req.body._team,
                            defaultLoginTeam: req.body.defaultLoginTeam,
                            _articleEditors: req.body._articleEditors,
                            _articleViewers: req.body._articleViewers,
                            _siteEditors: req.body._siteEditors,
                            _siteViewers: req.body._siteViewers,
                            canCreateNewViz: req.body.canCreateNewViz,
                            canCreateNewArticle: req.body.canCreateNewArticle,
                            canCreateNewSite: req.body.canCreateNewSite,
                        },
                    };

                    User.findOneAndUpdate(findQuery, updateQuery, { new: true })
                        .exec((err, updatedUser) => {

                            if (err) {
                                res.status(500).send({ error: 'An error occurred while updating user.' });
                            }

                            const teamId = req.body._team[req.body._team.length - 1];

                            Team.findById(teamId, (err, team) => {
                                if (err) {
                                    res.status(500).send({ error: 'An error occurred while finding team.' });
                                }

                                mailer.sendInvitationEmail(true, team, foundUser, updatedUser,
                                    err => {
                                        if (err) {
                                            return res.status(200).send({
                                                error: 'An error occurred while sending new user invitation email.',
                                            });
                                        }
                                        return res.status(200).send();
                                    },
                                );
                            });
                        });
                }
            } else {
                return res.status(401).send('unauthorized');
            }
        });
};
