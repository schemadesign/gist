const passport = require('passport');
const LocalStrategy = require('passport-local');
const LdapStrategy = require('passport-ldapauth');
const { OAuth2Strategy: GoogleStrategy } = require('passport-google-oauth');
const { Strategy: OktaStrategy } = require('passport-okta-oauth');
const FacebookStrategy = require('passport-facebook');
const TwitterStrategy = require('passport-twitter');
const { get } = require('lodash');

const Users = require('../app/models/users');
const { ldapConfig } = require('../app/utils/auth');

const protocole = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
const subdomain = process.env.NODE_ENV === 'enterprise' ? '' : 'app.';
const host = process.env.HOST ? process.env.HOST : 'localhost:9080';
const baseURL = `${protocole}${subdomain}${host}`;

if (process.env.AUTH_PROTOCOL === 'LDAP') {
    const ldapStrategy = getLdapStrategy();

    passport.use(ldapStrategy);
} else if (process.env.AUTH_PROTOCOL === 'OKTA') {
    const oktaStrategy = getOktaStrategy();

    passport.use(oktaStrategy);
} else {
    const localStrategy = getLocalStrategy();

    passport.use(localStrategy);

    if (process.env.NODE_ENV !== 'enterprise') {
        if (process.env.GOOGLE_CLIENT_ID) {
            const googleStrategy = getGoogleStrategy();
            passport.use(googleStrategy);
        }

        if (process.env.FACEBOOK_CLIENT_ID) {
            const facebookStrategy = getFacebookStrategy();
            passport.use(facebookStrategy);
        }

        if (process.env.TWITTER_CONSUMER_KEY) {
            const twitterStrategy = getTwitterStrategy();
            passport.use(twitterStrategy);
        }
    }
}

// This is not a best practice, but we want to keep things simple for now
// @todo: Replace this using a better practice.
passport.serializeUser((user, done) => {
    done(null, user._id.toString());
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

function getLocalStrategy() {
    const regexify = (email) => {
        const specialCharacters = ['\\', '+', '^', '$', '*', '?', '.'];

        specialCharacters.forEach((char) => {
            if (email.includes(char)) {
                email = email.split(char).join(`\\${char}`);
            }
        });

        email = `^${email}$`;

        return email;
    };

    return new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
    }, (email, password, done) => {
        email = regexify(email);

        // todo: lowercase all emails in the db and get rid of this unsafe regexp
        Users.findOne({ email: { $regex: email, $options: 'i' }, provider: 'local' })
            .populate('_team')
            .exec((err, user) => {
                if (err) {
                    return done(err);
                }

                if (!user || !user.salt) {
                    return done(null, false, { message: 'Invalid login information.' });
                }

                // Add properties prevent brute force login if user doesn't have them
                user.checkLoginAttempts();

                if (!user.validPassword(password)) {
                    // Locks user account if too many login attempts
                    user.lockoutUser();
                    user.save();

                    if (user.isLocked()) {
                        return done(null, false, { message: 'You tried to log in too many times.' });
                    }

                    return done(null, false, { message: 'Invalid login information.' });
                }

                // If lock time has elapsed, reset user lock and login attempts
                if (user.lockUntil !== 1) {
                    user.resetLock();
                }

                if (!user.activated) {
                    const link = `/api/user/${user._id}/resend?emailType=activation`;
                    return done(null, false, { message: 'Activation pending.', link });
                }

                if (user.validPassword(password)) {
                    user.resetLock();
                    user.save();
                }

                if (!user.active) {
                    return done(null, false, { message: 'This account is not active.' });
                }

                if (!user.defaultLoginTeam || user._team.length === 0) {
                    return done(null, false, { message: 'User is not associated with a team.', userId: user._id });
                }

                return done(null, user);
            });
    });
}

function getLdapStrategy() {
    const config = ldapConfig.getStrategyConfig();

    return new LdapStrategy(config, (profile, done) => {
        const { email } = ldapConfig.getProfileDetails(profile);
        const findQuery = { email };

        Users.findOne(findQuery, (err, user) => {
            return done(err, user, profile);
        });
    });
}

function verifyUser(accessToken, refreshToken, profile, done) {
    let firstName, lastName;

    if (profile.name) {
        firstName = profile.name.givenName;
        lastName = profile.name.familyName;
    } else {
        [firstName, lastName] = profile.displayName.split(' ');
    }

    const findQuery = { email: profile.emails[0].value };
    const userProfile = {
        email: profile.emails[0].value,
        provider: profile.provider,
        firstName,
        lastName,
        profileImageUrl: get(profile, ['photos', 0, 'value']),
        activated: true,
    };

    Users.findOne(findQuery, (err, user) => {
        if (user && !user.active) {
            return done(err, false, { message: 'This account is not active.' });
        }

        return done(err, user, userProfile);
    });
}

function getGoogleStrategy() {
    return new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${baseURL}/auth/google/callback`,

    }, verifyUser);
}

function getFacebookStrategy() {
    return new FacebookStrategy({
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: `${baseURL}/auth/facebook/callback`,
        profileFields: ['email', 'picture.type(large)', 'name'],
    }, verifyUser);
}

function getTwitterStrategy() {
    return new TwitterStrategy({
        consumerKey: process.env.TWITTER_CONSUMER_KEY,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        userProfileURL: 'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
        callbackURL: `${baseURL}/auth/twitter/callback`,
    }, verifyUser);
}

function getOktaStrategy() {
    return new OktaStrategy({
        audience: process.env.OKTA_AUDIENCE,
        clientID: process.env.OKTA_CLIENT_ID,
        clientSecret: process.env.OKTA_CLIENT_SECRET,
        scope: ['openid', 'email', 'profile'],
        response_type: 'code',
        callbackURL: `${baseURL}/auth/okta/callback`,
    }, verifyUser);
}
