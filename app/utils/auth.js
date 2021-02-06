const jwt = require('jsonwebtoken');
const winston = require('winston');

const Users = require('../models/users');
const Tokens = require('../models/tokens');
const { extractHostname } = require('../../shared/url');
const { UserError } = require('../libs/system/errors');
const { handleError } = require('../utils/requests');

let ldapConfig;

if (process.env.AUTH_PROTOCOL === 'LDAP') {
    try {
        const { ldapConfig: customLdapConfig } = require(`../../user/${process.env.SUBDOMAIN}/src/auth`);
        ldapConfig = Object.assign({}, getDefaultLdapConfig(), customLdapConfig);
    } catch (e) {
        ldapConfig = getDefaultLdapConfig();
    }
}


function getDefaultLdapConfig() {
    return {
        getProfileDetails(profile) {
            let { firstName = '', lastName = '' } = profile;
            const email = profile.email || '';

            if (!firstName && profile.name) {
                [firstName, lastName] = profile.name.split(' ');
            }

            return { firstName, lastName, email };
        },
        getStrategyConfig() {
            return {};
        },
        onAfterLogin(req, res, profile, callback) {
            callback();
        },
    };
}

const appendTokenToRequest = (req, res, next) => {
    try {
        const { token } = req.query;
        req.token = token;

        next();
    } catch (error) {
        winston.error(error);

        return res.status(404).render('error', {});
    }
};

const loginWithToken = async (req, res, next) => {
    try {
        const token = await Tokens.findOne({ token: req.token || req.params.token }).populate('apiKey');

        if (!token) {
            req.flash('error', { message: 'Token is invalid.' });

            return res.redirect('/auth/login');
        }

        const referer = req.header('Referer');

        if (!referer) {
            return handleError(new UserError('Missing referer'), res);
        }

        const isAuthorisedDomain = token.apiKey.requestDomains.some(domain => extractHostname(referer) === domain);

        if (!isAuthorisedDomain) {
            return handleError(new UserError('This domain is not authorised.'), res);
        }

        const decoded = jwt.verify(token.token, process.env.SESSION_SECRET);
        const user = await Users.findById(decoded.userId);

        if (!user.defaultLoginTeam || !user._team.length || token.apiKey.team.toString() !== user.defaultLoginTeam.toString()) {
            req.flash('error', { message: 'User is not associated with a team.' });
            return res.redirect('/auth/login');
        }

        req.logIn(user, async (err) => {
            if (err) {
                return next(err);
            }

            token.usedAt = new Date();
            await token.save();

            req.user = user;

            if (req.token) {
                return next();
            } else {
                return res.redirect('/dashboard');
            }

        });
    } catch (e) {
        req.flash('error', { message: 'Token is invalid.' });
        return res.redirect('/auth/login');
    }
};

module.exports = {
    ldapConfig,
    appendTokenToRequest,
    loginWithToken,
};
