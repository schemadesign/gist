const express = require('express');
const passport = require('passport');
const router = express.Router();
const winston = require('winston');
const async = require('async');
const { startCase } = require('lodash');

const Users = require('../models/users');
const Teams = require('../models/teams');
const { ldapConfig, loginWithToken } = require('../utils/auth');

const limiter = require('../utils/limiter');
const slowDown = require('../utils/slowDown');
const ctrlSmartsheet = require('../libs/datasources/smartsheet');
const ctrlPipedrive = require('../libs/datasources/pipedrive');
const ctrlDataDotWorld = require('../libs/datasources/data-dot-world');
const ctrlSalesforce = require('../libs/datasources/salesforce');
const libraries = require('../libs/middleware/views/libraryList');
const { checkCors, checkPermissions } = require('./permissions');
const errorReportObj = req => {
    return { email: req.body.email, route: req.route, _parsedUrl: req._parsedUrl, headers: req.headers };
};

const isOKTAProtocol = process.env.AUTH_PROTOCOL === 'OKTA';

if (isOKTAProtocol) {
    router.get('/login', function (req, res) {
        return res.redirect('/auth/okta');
    });
}

let thirdParties = [];

if (isOKTAProtocol) {
    thirdParties.push('okta');
}

if (process.env.NODE_ENV !== 'enterprise') {
    thirdParties.push('google', 'facebook', 'twitter');
}

const regenerateSession = (req, cb) => {
    const temp = req.session.passport;
    req.session.regenerate(function (err) {
        req.session.passport = temp;
        req.session.save(function () {
            cb();
        });
    });
};

const cleanEmail = (username) => {
    return username.split('@')[0];
};

const loginWithLocal = (req, res, next) => {
    const authenticationMiddleware = passport.authenticate('local', (err, user, info) => {
        if (err) {
            winston.error(`Passport.auth err: ${err} | User: ${user.email}`, errorReportObj(req));
            return next(err);
        }

        if (!user) {
            winston.error(`info.message: ${info.message}`, errorReportObj(req));
            if (info.message === 'no team set up') {
                return res.redirect(`/signup/info/${info.userId}`);
            }

            req.flash('error', info);
            return res.redirect('login');
        }

        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }

            if (process.env.NODE_ENV === 'enterprise') {
                return regenerateSession(req, () => {
                    limiter.resetKey(req.ip);
                    res.redirect(req.session.returnTo || '/dashboard');
                });
            }

            let redirectUrl = '/dashboard';

            // Redirect to team page if logging in from team subdomain
            if (req.hostname.split('.')[0] !== 'app') {
                redirectUrl = '/';
            }

            if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
                return regenerateSession(req, () => {
                    limiter.resetKey(req.ip);
                    res.redirect(req.session.returnTo || redirectUrl);
                });
            }

            limiter.resetKey(req.ip);
            return res.redirect(req.session.returnTo || redirectUrl);
        });
    });

    authenticationMiddleware(req, res, next);
};

const createUser = async (profile, isExtendedProfile) => {
    if (isExtendedProfile) {
        const teams = await Teams.find({}, '_id')
            .lean()
            .exec();
        const teamIds = teams.map(({ _id }) => _id);
        Object.assign(profile, {
            _team: teamIds,
            defaultLoginTeam: teamIds[0],
            canCreateNewViz: [],
            canCreateNewArticle: [],
            canCreateNewSite: [],
        });
    }

    return await Users.create(profile);
};

const checkLdapUser = async (user, profile, callback) => {
    // if there's a message attached to the ldap profile, something went wrong
    if (profile.message) {
        return callback({ message: profile.message, authError: true });
    }

    if (!user) {
        try {
            // get the user's first and last name
            const { firstName, lastName, email } = ldapConfig.getProfileDetails(profile);
            const userProfile = {
                email,
                firstName,
                lastName,
                provider: 'ldap',
            };
            const user = await createUser(userProfile, true);
            callback(null, user, profile);
        } catch (e) {
            callback(e);
        }

        return;
    }

    // users invited from atlas molecules
    if (!user.firstName) {
        const { firstName, lastName } = ldapConfig.getProfileDetails(profile);
        const insertQuery = {
            firstName,
            lastName,
        };

        return Users.findByIdAndUpdate(user._id, insertQuery, (err, user) => {
            callback(err, user, profile);
        });
    }

    callback(null, user, profile);
};

const loginWithLdap = (req, res, next) => {
    // Discard email domain, if present
    req.body.username = cleanEmail(req.body.username);

    async.waterfall([
        // authenticate using ldap auth
        (callback) => {
            passport.authenticate('ldapauth', (err, user, profile) => {
                callback(err, user, profile);
            })(req, res, next);
        },

        // create the user if none exists
        checkLdapUser,

        // login
        (user, profile, callback) => {
            regenerateSession(req, () => {
                limiter.resetKey(req.ip);
                req.login(user, err => callback(err, profile));
            });
        },

        (profile, callback) => {
            ldapConfig.onAfterLogin(req, res, profile, callback);
        },
    ], (err) => {
        if (err && err.authError) {
            req.flash('error', err);

            return res.redirect('login');
        }

        if (err) {
            return next(err);
        }

        res.redirect('/');
    });
};

thirdParties.forEach(protocol => {
    const opt = { scope: [] };

    if (protocol === 'google') {
        opt.scope = [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ];

    } else if (protocol === 'facebook') {
        opt.scope = ['email'];
    } else if (protocol === 'okta') {
        opt.scope = ['openid', 'email', 'profile'];
    }

    router.get('/' + protocol, (req, res, next) => {
        next();
    }, passport.authenticate(protocol, opt));

    router.get('/' + protocol + '/callback', (req, res, next) => {
        passport.authenticate(protocol, async (err, user, userProfile) => {
            if (err) {
                winston.error(`Passport.auth err: ${err} | User: ${user.email}`, errorReportObj(req));
                return next(err);
            }

            if (!userProfile) {
                winston.error('Passport.auth no user profile');
                req.flash('error', { message: 'Authentication failed' });
                return res.redirect('/auth/login');
            }

            if (!user) {
                const isExtendedProfile = protocol === 'okta';

                if (!isExtendedProfile) {
                    winston.error('Passport.auth no user');
                    req.flash('error', { message: `No user connected with the ${startCase(protocol)} profile` });
                    return res.redirect('/auth/login');
                }

                try {
                    user = await createUser(userProfile, isExtendedProfile);
                } catch (error) {
                    winston.error('Error when creating third parties user :', error);
                    return next(error);
                }

            }

            if (!user._team || user._team.length === 0) {
                limiter.resetKey(req.ip);
                return res.redirect('/signup/info/' + user._id);
            }

            req.login(user, err => {
                if (err) {
                    winston.error(`Login error: ${err}`, errorReportObj(req));
                    return next(err);
                }

                return regenerateSession(req, () => {
                    limiter.resetKey(req.ip);
                    res.redirect(req.session.returnTo || '/dashboard');
                });
            });
        })(req, res, next);
    });
});

router.get('/login/:token', loginWithToken);

router.post('/login', limiter, slowDown(), (req, res, next) => {
    if (process.env.AUTH_PROTOCOL === 'LDAP') {
        return loginWithLdap(req, res, next);
    }

    loginWithLocal(req, res, next);
});

router.get('/login', (req, res) => {
    if (req.user) {
        Users.findById(req.user, (err, user) => {
            if (user) {
                if (!user.defaultLoginTeam || user._team.length === 0) {
                    return res.redirect('/signup/info/' + req.user);

                } else {
                    return res.redirect('/dashboard');
                }
            } else {
                return res.render('auth/login', {
                    env: process.env,
                    flash: '',
                    has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
                    globalLibraries: [
                        ...libraries.JAVASCRIPT,
                    ],
                });

            }
        });
    } else {
        return res.render('auth/login', {
            env: process.env,
            flash: req.flash(),
            has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
            globalLibraries: [
                ...libraries.JAVASCRIPT,
            ],
        });
    }
});

router.get('/logout', (req, res) => {
    req.session.returnTo = req.query.returnTo || null;

    req.logout();
    res.status(200).send('ok');
});

/**
 * OAuth2 Endpoints
 */

// smartsheet
router.get('/smartsheet', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSmartsheet.smartsheetCallback);
router.get('/smartsheet/redirect', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSmartsheet.requestPermissionLink);

// pipedrive
router.get('/pipedrive', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPipedrive.pipedriveCallback);
router.get('/pipedrive/redirect', checkCors(), checkPermissions({ isAnonymous: false }), ctrlPipedrive.requestPermissionLink);

// data.world
router.get('/datadotworld', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataDotWorld.datadotworldCallback);
router.get('/datadotworld/redirect', checkCors(), checkPermissions({ isAnonymous: false }), ctrlDataDotWorld.requestPermissionLink);

// salesforce
router.get('/salesforce', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSalesforce.salesforceCallback);
router.get('/salesforce/redirect', checkCors(), checkPermissions({ isAnonymous: false }), ctrlSalesforce.requestPermissionLink);

module.exports = router;
