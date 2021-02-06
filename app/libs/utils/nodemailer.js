const winston = require('winston');
const _ = require('lodash');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../../models/users');
const ObjectId = require('mongodb').ObjectId;
const jwtSecret = process.env.SESSION_SECRET;
const inviteCode = require('../utils/invitation-code-helpers');
const moment = require('moment');
const aws = require('aws-sdk');

let SES = {};

if (process.env.NODE_ENV !== 'testing') {
    SES = new aws.SES();
}

const transporter = nodemailer.createTransport({
    SES,
    sendingRate: 1,
});

const alert_email = process.env.ALERT_EMAIL || 'info@schemadesign.com';
const rootDomain = process.env.HOST ? process.env.HOST : 'localhost:9080';

let baseURL = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
baseURL += process.env.NODE_ENV === 'enterprise' ? rootDomain : 'app.' + rootDomain;

// CSS files don't like html elements in them, so create head and style here
let styleHeader = '<head><style>';

// Read in the css template from email_template/email_template.css
fs.readFile(path.join(__dirname, '/email_template/email_template.css'), 'utf8', (err, data) => {
    if (err) {
        // Not the end of the world if we can't get styles
        winston.warn('Could not import email_template.css' + err);
        styleHeader += '</style></head>';
        return;
    }
    // Put the styles for the email into the styleHeader
    styleHeader += data + '</style></head>';
});

// Instantiate emailTemplate here to be used in formatEmailTemplate
let emailTemplate = '';

// Read in the html template from email_template/email_template.html
fs.readFile(path.join(__dirname, '/email_template/email_template.html'), 'utf8', (err, data) => {
    if (err) {
        // If we can't load the email template, this is going to look really ugly
        winston.error('Could not import email_template.html' + err);
        return;
    }
    // Put the template into emailTemplate
    emailTemplate = data;
});

/**
 * Take in a header text, a more verbose bodyText, a link and linkText and build our email template.
 * Uses emailTemplate as a base for replacing a few fields with our desired text, and also adds
 * styleHeaader styles for making the email look 😎.
 * Returns a string with the finished template.
 *
 * @param {string} headerText
 * @param {string} bodyText
 * @param {string} link
 * @param {string} linkText
 */
const formatEmailTemplate = (headerText, bodyText, link, linkText) => {
    // If the email template wasn't loaded we at least need to send something
    if (emailTemplate.length === 0) {
        return '<h1>' + headerText + '</h1>' +
            '<p>' + bodyText + '<br><br>' +
            '<a href="' + link + '">' + linkText + '</a></p>';
    }
    // Add the styles and copy the email template
    const email_builder = styleHeader + emailTemplate;
    // Replace the four inputs using loadash.template
    const compile = _.template(email_builder);
    const now = new Date();
    const replaceTextObj = {
        headerText: headerText,
        bodyText: bodyText,
        link: link,
        linkText: linkText,
        copyrightYear: now.getFullYear(),
    };
    // Return the built email template
    return compile(replaceTextObj);
};

/**
 * Emails to users
 */
function sendEmail(mailOptions, callback) {
    winston.info('mailoptions: ' + JSON.stringify(mailOptions));

    if (process.env.NODE_ENV !== 'testing' && process.env.ALLOW_EMAILS === 'true') {
        transporter.sendMail(mailOptions, function(err) {
            if (err) {
                winston.error('sendEmail err:' + err);
            }

            if (callback) {
                callback(err);
            }
        });
    } else {
        callback();
    }
}

module.exports.sendEmail = sendEmail;

module.exports.sendVizFinishProcessingEmail = function(user, dataset, team, cb) {

    var default_view = dataset.fe_views.default_view;
    var protocol = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
    var datasetTitle = dataset.title;
    var datasetUID = dataset.uid;
    var datasetRevision = dataset.importRevision;

    var isAutomated = dataset.lastImportTriggeredBy === 'automated';

    if (dataset.schema_id && (!datasetTitle || !datasetUID || !datasetRevision)) {
        datasetTitle = dataset.schema_id.title || datasetTitle;

        datasetUID = dataset.schema_id.uid || datasetUID;
        datasetRevision = dataset.schema_id.importRevision || datasetRevision;
        default_view = dataset.schema_id.fe_views.default_view;
    }

    // var link = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
    // link += team.subdomain + '.' + rootDomain + '/' + datasetUID + '-r' + datasetRevision + '/' + default_view;
    var link;
    var linkMsg;

    if (default_view !== undefined) {
        link = protocol + team.subdomain + '.' + rootDomain + '/' + dataset.uid + '-r' + dataset.importRevision + '/' + default_view;
        linkMsg = 'Use the following link to view your visualization:';
    } else {

        link = protocol;
        link += (process.env.NODE_ENV !== 'enterprise') ? 'app.' : '';
        link += rootDomain + '/dashboard/dataset/' + dataset._id + '/views';
        linkMsg = 'Use the following link to continue editing your visualization:';
    }

    var mailOptions = {
        from: alert_email,
        to: user.email,
        subject: 'Visualization Import Finished!',
        html:
            formatEmailTemplate(
                'Your visualization, "' + datasetTitle + '" has finished ' + ((isAutomated) ? 'scheduled ' : '') + 'importing.',
                linkMsg,
                link,
                'Edit Now',
            ),
    };

    sendEmail(mailOptions, cb);
};

module.exports.sendResetPasswordEmail = function(user, cb) {
    var token = jwt.sign({
        _id: user._id,
        email: user.email,
    }, jwtSecret, { expiresIn: '24h' });

    var link = baseURL + '/account/reset_password?token=' + token;
    var mailOptions = {
        from: alert_email,
        to: user.email,
        subject: 'Account Password Reset',
        html:
            formatEmailTemplate(
                'Hello ' + user.firstName + ',',
                'Use the following link to reset your Gist account password. This link will expire in twenty four hours.',
                link,
                'Reset Password',
            ),
    };

    sendEmail(mailOptions, function(err) {
        if (err) {
            winston.error('sendResetPasswordEmail err: ' + err);
        }
        cb(err);
    });
};

module.exports.sendActivationEmail = function(user, cb) {
    const token = inviteCode.generateRandomCode(3);

    var link = `${baseURL}/account/verify?token=${token}`;
    // Update the user with the direct so the admin can send a direct invite link
    User.update({ _id: ObjectId(user._id) }, {
        $set: {
            confirmation_code_hash: {
                hash: inviteCode.createHashWithString(token),
                expiration: moment().utc().add(1, 'd').format('x'),
            },
        },
    }, (err, body) => {
        if (err || body.ok === 0) {
            // Something went wrong, let's at least report it and put the link in
            winston.error('Could not save invitation link to user document.', { link });
            winston.info(link);
        }
    });
    var mailOptions = {
        from: alert_email,
        to: user.email,
        subject: 'Welcome To Gist!',
        html:
            formatEmailTemplate(
                'Hello ' + user.firstName + ',',
                'Thank you for creating an account on Gist! Follow this link to activate your account. This link will expire in twenty four hours.',
                link,
                'Activate your account',
            ),
    };

    sendEmail(mailOptions, function(err) {
        if (err) {
            winston.error('sendActivationEmail err: ' + err);
        }
        cb(err);
    });
};

module.exports.sendInvitationEmail = function(existingUser, team, inviter, invitee, cb) {

    const headerText = `The admin of <b>${team.title}</b> has invited you to join their team on Gist.`;
    let expiresHtml = '';
    let link;
    let linkButtonText = 'Accept Team Invitation';

    // Never let an on-premise invitation expire
    if (process.env.NODE_ENV !== 'enterprise') {
        expiresHtml = 'This link will expire in twenty four hours. ';
    }

    if (existingUser === false) {
        // Set the link and set the email message with the plain text code
        link = `${baseURL}/account/invitation?token=${invitee.tempCode}`;
        // expiresHtml = `Use this activation code to complete your Gist registration: ${invitee.tempCode}\n<br><br>`;
        // We don't want to save this anywhere, delete it to be safe
        delete invitee.tempCode;

        const directSignupLink = `${baseURL}/signup/info/${invitee._id}`;

        // Update the user with the direct so the admin can send a direct invite link
        User.update({ _id: ObjectId(invitee._id) }, {
            $set: {
                inviteLink: directSignupLink,
                inviter: inviter._id,
                confirmation_code_hash: invitee.confirmation_code_hash,
            },
        }, (err, body) => {
            if (err || body.ok === 0) {
                // Something went wrong, let's at least report it and put the link in
                winston.error('Could not save invitation link to user document.', { link });
                winston.info(link);
            }
        });
    } else {
        linkButtonText = 'Log into Gist';
        expiresHtml = 'Log into Gist to access the team you have been added to.';
        link = `${baseURL}/auth/login`;
    }

    let mailOptions = {
        from: alert_email,
        to: invitee.email,
        subject: 'Invitation to Join \'' + team.title + '\' on Gist',
        html:
            formatEmailTemplate(
                headerText,
                expiresHtml,
                link,
                linkButtonText,
            ),
    };

    /**
     * Workaround for CMR Toolkit invites
     * TODO remove when safe or make this a customization and place in user folder
     */
    if ((inviter.defaultLoginTeam.subdomain === 'cmrtoolkit' || inviter.email === 'contactcmr@rhg.com' || inviter.email === 'jkan@rhg.com') && !existingUser) {
        mailOptions = {
            from: alert_email,
            to: 'contactcmr@rhg.com',
            subject: `Create an account for ${invitee.email}`,
        };
        mailOptions.html =
            formatEmailTemplate(
                `Please confirm invite of <b>${invitee.email}</b>`,
                '',
                link,
                'Confirm Invite',
            );
    }

    sendEmail(mailOptions, function(err) {
        if (err) {
            winston.error('sendInvitationEmail err: ' + err);
        }
        cb(err);
    });
};

/** Update user on visualization display status */
function sendVizDisplayStatusUpdate(state, authorName, authorEmail, datasetTitle, cb) {
    var titleCaseState = state[0].charAt(0).toUpperCase() + state.slice(1);
    var mailOptions = {
        from: alert_email,
        to: authorEmail,
        subject: 'Visualization Listing Request: ' + titleCaseState,
        html:
            formatEmailTemplate(
                'Hello ' + authorName + ',',
                'Your visualization ' + datasetTitle + ' has been ' + state + ' for listing on Gist.',
                baseURL,
                rootDomain,
            ),
    };

    sendEmail(mailOptions, cb);
}

function sendArticleDisplayStatusUpdate(state, authorName, authorEmail, articleTitle, cb) {
    var titleCaseState = state[0].charAt(0).toUpperCase() + state.slice(1);
    var mailOptions = {
        from: alert_email,
        to: authorEmail,
        subject: 'Article Listing Request: ' + titleCaseState,
        html:
            formatEmailTemplate(
                'Hello ' + authorName + ',',
                'Your article "' + articleTitle + '" has been ' + state + ' for listing on Gist.',
                baseURL,
                rootDomain,
            ),
    };

    sendEmail(mailOptions, cb);
}

module.exports.notifyVizApprovalAction = function(viz, cb) {
    var authorName = viz.author.firstName + ' ' + viz.author.lastName;
    sendVizDisplayStatusUpdate(viz.state, authorName, viz.author.email, viz.title, cb);
};

module.exports.notifyArticleApprovalAction = function(page, cb) {
    var authorName = page.createdBy.firstName + ' ' + page.createdBy.lastName;
    sendArticleDisplayStatusUpdate(page.state, authorName, page.createdBy.email, page.pageTitle, cb);
};
