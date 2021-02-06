const integerValidator = require('mongoose-integer');
const winston = require('winston');
const { isEmpty } = require('lodash');

const mongoose_client = require('./mongoose_client');

const mongoose = mongoose_client.mongoose;
const Schema = mongoose.Schema;

const team_scheme = Schema({
    title: String,
    subdomain: { type: String, unique: true },
    description: String,
    font: { type: String, default: 'centrano2' },
    logo: String,
    logo_header: String,
    externalWebsite: String,
    colorPalette: {
        type: Array,
        default: [
            '#1B6DFC',
            '#0CB7FA',
            '#FA79FC',
            '#FB3705',
            '#F9D307',
            '#FA9007',
            '#7D5807',
            '#B2E606',
            '#069908',
            '#7B07FD',
        ],
    },
    superTeam: Boolean,
    admin: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    datasourceDescriptions: [{ type: Schema.Types.ObjectId, ref: 'DatasourceDescription' }],
    pages: [{ type: Schema.Types.ObjectId, ref: 'Page' }],
    sites: [{ type: Schema.Types.ObjectId, ref: 'Website' }],

    isEnterprise: Boolean, //if true, means it has custom view - TODO consolidate with hasEnterpriseLicense
    customViewModal: Boolean, //if true, custom view has custom view settings modal - (rhodiumgroup)
    hasEnterpriseLicense: { type: Boolean, default: false },

    google_analytics: String,
    header_script: String,
    footer_script: String,
    brandColor: {
        label: { type: String, default: '#2A2A2A' },
        select: { type: String, default: '#2A2A2A' },
    },

}, { timestamps: true });

const modelName = 'Team';

team_scheme.plugin(integerValidator);

const deepPopulate = require('mongoose-deep-populate')(mongoose);

team_scheme.plugin(deepPopulate, { whitelist: ['datasourceDescriptions.author', 'datasourceDescriptions.updatedBy', 'datasourceDescriptions.createdAt'] });

team_scheme.pre('save', function (next) {
    this._wasNew = this.isNew;
    next();
});

team_scheme.methods.notifyNewTeamCreation = function () {
    if (this._wasNew) {
        this.populate('admin', function (err, docPopulatedWithAdmin) {
            if (err || isEmpty(docPopulatedWithAdmin.admin)) {
                winston.error('Team created with error err:' + err);
            }
        });
    }
};

team_scheme.statics.getTeamEntries = async (subdomain, user, vizName) => {
    const baseQuery = { subdomain };

    if (process.env.NODE_ENV === 'enterprise' && !process.env.SUBTEAMS) {
        baseQuery.subdomain = process.env.SUBDOMAIN;
    }

    const populateQuery = [
        {
            path: 'datasourceDescriptions',
            match: require('./descriptions').buildTeamPageQuery(user, vizName),
            select: 'description uid urls title importRevision updatedAt createdAt previous_datasets updatedBy author brandColor fe_views fe_filters.default banner connection',
            populate: [
                {
                    path: 'updatedBy',
                    select: 'firstName lastName',
                },
                {
                    path: 'author',
                    select: 'firstName lastName',
                },
                {
                    path: 'previous_datasets',
                    select: 'createdAt -_id',
                },
            ],
            options: {
                sort: {
                    createdAt: -1,
                },
            },
        },
        {
            path: 'pages',
            match: require('./pages').buildTeamPageQuery(user),
            select: 'pageTitle slug parsedSummary url thumbnail image updatedBy createdBy createdAt updatedAt createdAt',
            populate: [
                {
                    path: 'createdBy',
                    select: 'firstName lastName -_id',
                },
                {
                    path: 'website',
                    select: 'slug -_id',
                },
            ],
            options: {
                sort: {
                    createdAt: -1,
                },
            },
        },
    ];

    return team.find(baseQuery).populate(populateQuery);
};

const team = mongoose.model(modelName, team_scheme);

team.GetTeams = function (fn) {
    mongoose_client.WhenMongoDBConnected(function () {
        team.find({}, function (err, teams) {
            if (err) {
                fn(err);
            } else {
                fn(null, teams);
            }
        });
    });
};

module.exports = team;
