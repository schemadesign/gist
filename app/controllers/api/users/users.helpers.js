const async = require('async');

const User = require('../../../models/users');
const Team = require('../../../models/teams');
const mailer = require('../../../libs/utils/nodemailer');
const sample_dataset = require('../sample_dataset');

const isEnterprise = process.env.NODE_ENV === 'enterprise';

/**
 * if team is enterprise, get team object
 * @param {object} req - the req
 * @param {function} callback
 */
const getEnterpriseTeam = (req, callback) => {
    if (isEnterprise) {
        Team.findOne({ subdomain: process.env.SUBDOMAIN }, (err, team) => {
            callback(err, team, req);
        });
    } else {
        callback(null, null, req);
    }
};

/**
 * create a new team if there is no enterprise team
 * @param {object} enterpriseTeam - found enterprise team or null
 * @param {object} req - request
 * @param {function} callback
 */
const newTeam = (enterpriseTeam, req, callback) => {
    const { _id: userId, _team: team } = req.body;

    if (!enterpriseTeam) {
        team.admin = [userId];
        team.superTeam = (team.subdomain === 'schema' || isEnterprise);
        team.isEnterprise = isEnterprise;

        Team.create(team, (err, createdTeam) => {
            if (err) {
                return callback(err);
            } else if (!createdTeam) {
                return callback(new Error('Could not create team'));
            } else {
                if (createdTeam.title !== 'sampleTeam' && (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging')) {
                    return sample_dataset.delegateDatasetDuplicationTasks(userId, createdTeam, err => {
                        if (err) {
                            return callback(err);
                        }

                        callback(null, req, createdTeam);
                    });
                }

                callback(null, req, createdTeam);
            }
        });
    } else {
        callback(null, req, enterpriseTeam);
    }
};

/**
 * find and update the user object
 * @param {object} req - request
 * @param {object} team
 * @param {function} callback
 */
const updateUser = (req, team, callback) => {
    const { firstName, lastName, password, _id: userId } = req.body;

    User.findById(userId, (err, user) => {
        if (err || !user) {
            return callback(err || new Error(`Could not find user with id: ${userId}`));
        }

        if (req.isAnonymous && user.signedUp) {
            return callback(new Error('User already registered'));
        } else {
            user.signedUp = true;
        }

        if (user.provider === 'local' && password && (!user.hash || !user.salt)) {
            user.setPassword(password);
        }
        user.firstName = firstName;
        user.lastName = lastName;
        user._team = [team._id];
        user.defaultLoginTeam = team._id;
        callback(null, user, team);
    });
};

/**
 * find user and check if he has already signed in before
 * @param {object} req - request
 * @param {function} callback
 */
const checkUser = (req, callback) => {
    const { _id: userId } = req.body;

    User.findById(userId, (err, user) => {
        if (err || !user) {
            return callback(err || new Error(`Could not find user with id: ${userId}`));
        }

        if (user.signedUp) {
            return callback(new Error('User already registered'));
        }

        return callback(null);
    });
};

/**
 * Set activated to true.
 * Users creating their own team will need to click the email verification link to activate.
 * Invited users have already arrived at the signup page via the email link.
 * @param {object} user
 * @param {object} team
 * @param {function} callback
 */
const activateUser = (user, team, callback) => {
    user.activated = true;
    callback(null, user, team);
};

/**
 * save the updated user
 * @param {object} user
 * @param {object} team
 * @param {function} callback
 */
const saveUpdatedUser = (user, team, callback) => {
    user.save((err, updatedUser) => {
        callback(err, updatedUser, team);
    });
};

/**
 * if not enterprise, call method to send email notifying user that their team was created
 * if user is activated (aka invited user) - do nothing
 * if user is not activated (aka creating team) - call method to send an activation email link
 * @param {object} user
 * @param {object} team
 * @param {function} callback
 */
const sendNotificationEmail = (user, team, callback) => {
    if (!isEnterprise) {
        team.notifyNewTeamCreation();
    }

    if (user.activated) {
        callback(null, user);
    } else {
        mailer.sendActivationEmail(user, err => {
            callback(err, user);
        });
    }
};

/**
 * new user signup process
 */
module.exports.newUser = (req, callback) => {
    async.waterfall([
        async.apply(checkUser, req),
        async.apply(getEnterpriseTeam, req),
        newTeam,
        updateUser,
        saveUpdatedUser,
        sendNotificationEmail,
    ], (err, user) => {
        callback(err, user);
    });
};

/**
 * invited user signup process
 */
module.exports.userInvited = (req, callback) => {
    const { _team: team } = req.body;

    async.waterfall([
        async.apply(checkUser, req),
        async.apply(updateUser, req, team),
        activateUser,
        saveUpdatedUser,
    ], (err, user) => {
        callback(err, user);
    });
};
