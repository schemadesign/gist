const mongoose = require('mongoose');
const crypto = require('crypto');
const winston = require('winston');
const { isEmpty } = require('lodash');

const { Schema } = mongoose;

const userSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: true,
    },
    firstName: String,
    lastName: String,
    profileImageUrl: String,
    provider: String,
    hash: String,
    salt: String,
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Number, default: 1 },
    activated: {
        type: Boolean,
        default: false,
    },
    sampleImported: {
        type: Boolean,
        default: false,
    },
    _team: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    active: {
        type: Boolean,
        default: true,
    },
    inviteLink: String,
    // denotes those users with non-schema emails as superAdmins
    superUser: Boolean,

    invited: Object, //temp object to store invited new user
    canCreateNewViz: Array,
    canCreateNewArticle: Array,
    canCreateNewSite: Array,
    _editors: [{ type: Schema.Types.ObjectId, ref: 'DatasourceDescription' }],
    _viewers: [{ type: Schema.Types.ObjectId, ref: 'DatasourceDescription' }],
    _articleEditors: [{ type: Schema.Types.ObjectId, ref: 'Page' }],
    _articleViewers: [{ type: Schema.Types.ObjectId, ref: 'Page' }],
    _siteEditors: [{ type: Schema.Types.ObjectId, ref: 'Website' }],
    _siteViewers: [{ type: Schema.Types.ObjectId, ref: 'Website' }],
    defaultLoginTeam: { type: Schema.Types.ObjectId, ref: 'Team' },
    inviteToken: { type: Schema.Types.ObjectId, ref: 'Token' },
    confirmation_code_hash: Object,
    signedUp: {
        type: Boolean,
        default: false,
    },
    inviter: String,
    role: String,
    smartsheetToken: Object, // Smartsheet token object to hold smartsheet token connection information
    pipedriveToken: Object, // Pipedrive token object
    datadotworldToken: Object, // Data.world token object
    salesforceToken: Object, // Salesforce token object
}, { timestamps: true });

const deepPopulate = require('mongoose-deep-populate')(mongoose);
userSchema.plugin(deepPopulate, { whitelist: ['defaultLoginTeam.datasourceDescriptions', '_team.datasourceDescriptions'] });

userSchema.methods.setPassword = function (password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

userSchema.methods.validPassword = function (password) {
    const hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
    return this.hash === hash;
};

userSchema.methods.isSuperAdmin = function () {
    const re = new RegExp('\\+superuser@schemadesign.com$');
    return re.test(this.email) || this.superUser === true;
};

userSchema.methods.isAdmin = function (team) {
    if (!team) {
        winston.warn('isAdmin was called without team param');
        return false;
    }

    if (isEmpty(team.admin)) {
        winston.warn('isAdmin was called on team without admin set');
        return false;
    }

    const userId = this._id.toString();

    return team.admin.some(id => id.toString() === userId);
};

userSchema.methods.isTeamMember = function (team) {
    if (!team) {
        winston.warn('isTeamMember was called without team param');
        return false;
    }
    return this._teams.some(team => team.equals(team._id));
};

userSchema.methods.isLocked = function () {
    // check for a future lockUntil timestamp
    return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.checkLoginAttempts = function () {
    // Add properties to prevent brute force login if user doesn't have them
    if (!this.lockUntil) {
        this.lockUntil = 1;
    }
    if (!this.loginAttempts) {
        this.loginAttempts = 0;
    }
};

userSchema.methods.lockoutUser = function () {
    this.loginAttempts += 1;
    if (this.loginAttempts > 5) { // Lock user out after 6 failed login attempts
        this.lockUntil = Date.now() + (24 * 60 * 60 * 1000); // Lock user out for 24 hours
    }
};

userSchema.methods.resetLock = function () {
    this.loginAttempts = 0;
    this.lockUntil = 1;
};

module.exports = mongoose.model('User', userSchema);
