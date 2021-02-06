// Module Imports
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const async = require('async');
const winston = require('winston');
const moment = require('moment');

const inviteCode = require('../libs/utils/invitation-code-helpers');
const { UserError } = require('../libs/system/errors');

// Model & Helper Imports
const User = require('../models/users');
const jwtSecret = process.env.SESSION_SECRET;

/**
 * Endpoint: /account/reset_password
 * Takes in a jwt token, and verfies it and redirects to the user to the
 * reset password page.
 * TODO: Don't verify the jwt token here, simply pass it to the reset password. And then verify there.
 *      Someone who has a user id can change the password without any kind of auth 😬
 * @param req.query.token
 */
router.get('/reset_password', (req, res) => {
    var token = req.query.token;

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.redirect('/reset/password?err=' + err.name + '&msg=' + err.message);
        }
        var userId = decoded._id;
        return res.redirect('/reset/password?userId=' + userId);
    });
});

/**
 * Endpoint: /account/verify
 * Takes in a jwt token, and finishes the user creation process.
 * Sets activated to true on the user document in Mongo
 * @param req.query.token
 */
router.get('/verify', (req, res) => {
    const token = inviteCode.createHashWithString(req.query.token);

    findAndValidateUserFromHash(token, (err, decoded) => {
        if (err) {
            winston.error('jwt.verify err:', err);
            res.redirect('/signup/error?name=' + err.name + '&msg=' + err.message);
        } else {
            async.waterfall([
                (callback) => {
                    // Update the user's activated status
                    User.findOneAndUpdate({ _id: decoded._id, email: decoded.email }, { $set: { activated: true } })
                        .populate('defaultLoginTeam')
                        .exec((err, user) => {
                            if (err) {
                                return callback(err);
                            }

                            // sign user up for free trial on activation
                            if (!user.defaultLoginTeam || !user._team.length) {
                                return callback(new UserError('no default login team'));
                            }

                            const userId = user._id.toString();

                            // If the user isn't authorized to log in to the team, or isn't an admin don't let them
                            // through
                            if (!user.isSuperAdmin() && !user.defaultLoginTeam.admin.some(id => id.toString() === userId)) {
                                return callback(new UserError('not authorized'));
                            }

                            callback(null, user);
                        });
                },
            ], (err) => {
                if (err) {
                    req.flash('error', { message: err instanceof UserError ? err.message : 'An error occurred.' });
                    return res.redirect('/auth/login');
                }

                req.flash('success', { message: 'Account is activated. You can log in with your credentials now' });
                return res.redirect('/auth/login');
            });
        }
    });
});

/**
 * Endpoint: /account/invitation
 * Takes in a short token, and verifies it and then calls assignRoleToUser to finish the
 * user inivation workflow.
 * @param req.query.token
 */
router.get('/invitation', (req, res) => {
    const token = req.query.token;

    if (token) {
        // Hash the token, and then find the user it belongs to
        const confirmation_code_hash = inviteCode.createHashWithString(token);
        findAndValidateUserFromHash(confirmation_code_hash, (err, user) => {
            if (err) {
                winston.error('account/invitation err', err);
                return res.render('partials/invitation-error', { name: err.name, message: err.message });
            }

            assignRoleToUser(user, (err) => {
                if (err) {
                    return res.render('partials/invitation-error', { name: err.name, message: err.message });
                }

                return res.redirect('/signup/info/' + user._id);
            });
        });
    } else {
        // If a token wasn't passed then we should be receiving a confirmation code from the user
        res.render('partials/enter_confirmation_code');
    }
});

/**
 * Endpoint: /account/invitation
 * Takes in a passed confirmation_code and then confirms it against a user.
 * Should redirect to finish creating the user account!
 * @param req.body.confirmation_code
 */
router.post('/invitation', (req, res) => {
    // Get the plain text and hash it
    const confirmation_code_hash = inviteCode.createHashWithString(req.body.confirmation_code.toLowerCase());

    // Try and find the hash in a User document
    findAndValidateUserFromHash(confirmation_code_hash, (err, user) => {
        if (err) {
            winston.error('Could not find the user', err);
            return res.render('partials/enter_confirmation_code', { message: err.message });
        }

        // Time to assign roles to the user and redirect!
        assignRoleToUser(user, (err) => {
            if (err) {
                return res.render('partials/enter_confirmation_code', { message: err.message });
            }

            // TODO: Pass along some kind of authentication from here so that all of this auth has a point
            return res.redirect('/signup/info/' + user._id);
        });
    });
});

/**
 * Finds the User in Mongo and gets the user roles assigned
 * to the user from the inviter.
 * @param decoded
 * @param callback
 */
function assignRoleToUser(decoded, callback) {
    User.findById(decoded._id)
        .exec((err, user) => {
            if (err) {
                return callback(err);
            }

            User.findById(decoded.inviter)
                .exec(async (err, admin) => {
                    if (err) {
                        winston.error('Error finding user role', err);
                        return callback(err);
                    }

                    if (!admin) {
                        winston.error('Could not find inviter', err);
                        return callback(new Error('could not find inviter'));
                    }

                    delete admin.invited[decoded._id];
                    admin.markModified('invited');
                    try {
                        await admin.save();
                        await unnecessaryFieldsCleanup(user);
                        callback();
                    } catch (err) {
                        callback(err);
                    }
                });
        });
}

/**
 * Find the user document from a hash, also ensure that the hash hasn't expired. If there's an error it
 * calls cb with an error in the first param.
 * @param {*} hash
 * @param {function} next
 */
function findAndValidateUserFromHash(hash, next) {
    // Try and find the hash in a User document
    User.findOne({ 'confirmation_code_hash.hash': hash }, (err, user) => {
        if (err || !user) {
            return next(new UserError('Not able to find your code. Please ensure you typed it in correctly.'));
        }

        // Get the expiration code and make sure the time limit hasn't been passed
        const exp = Number(user.confirmation_code_hash.expiration);
        if (process.env.NODE_ENV !== 'enterprise' && Number(moment().utc().format('x')) > exp) {
            return next(new UserError('Your invitation code has expired, please contact the team admin to resend the invite.'));
        }

        next(false, user);
    });
}

/**
 * A cleanup function to get rid of a bunch of unnecessary fields now the user has signed up.
 * @param {*} user
 */
async function unnecessaryFieldsCleanup(user) {
    // todo: cleanup these fields after user finishes registration
    delete user.inviter;
    delete user.inviteLink;
    delete user.confirmation_code_hash;

    user.markModified('inviter');
    user.markModified('inviteLink');
    user.markModified('confirmation_code_hash');
    await user.save();
}

// Return the built router
module.exports = router;
