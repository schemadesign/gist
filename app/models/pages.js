const mongoose_client = require('./mongoose_client');
const { isNull } = require('lodash');

const mongoose = mongoose_client.mongoose;
const Schema = mongoose.Schema;

// TODO:
// the acknowledgement should be moved into an object that's connected with the image

const pageSchema = Schema({
    pageTitle: String,
    slug: String,
    metaTitle: String,
    metaDescription: String,
    rawSummary: String,
    parsedSummary: String,
    rawBody: String,
    parsedBody: String,
    rawAbout: String,
    parsedAbout: String,
    url: String,
    thumbnail: String,
    image: String,
    pdf: String,
    acknowledgement: String,
    published: { type: Boolean, default: false },
    displayOnTeamPage: { type: Boolean, default: false },
    displayOnExplorePage: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    isArticle: Boolean,
    state: String,
    team: { type: Schema.Types.ObjectId, ref: 'Team' },
    website: { type: Schema.Types.ObjectId, ref: 'Website' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { updatedAt: 'updatedAt' } });

const deepPopulate = require('mongoose-deep-populate')(mongoose);

pageSchema.plugin(deepPopulate);

pageSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

pageSchema.statics.buildTeamPageQuery = (user) => {
    const baseQuery = { displayOnTeamPage: true };

    if (!user) {
        return {
            ...baseQuery,
            published: true,
        };
    }

    if (user.isSuperAdmin()) {
        return baseQuery;
    }

    const userId = user._id.toString();

    return {
        ...baseQuery,
        $or: [
            {
                team: {
                    $in: user._team
                        .filter(team => team.admin.some(id => id.toString() === userId))
                        .map(team => team._id),
                },
            },
            { _id: { $in: user._articleEditors } },
            { _id: { $in: user._articleViewers } },
            { published: true },
        ],
    };
};

pageSchema.statics.getShowcasedEntries = async function () {
    const pages = await this
        .find({
            published: true,
            state: 'approved',
            displayOnExplorePage: true,
        })
        .sort('-createdAt')
        .populate([
            {
                path: 'createdBy',
                select: 'firstName lastName -_id',
            },
            {
                path: 'website',
                select: 'slug -_id',
            },
            {
                path: 'team',
                select: 'subdomain -_id',
            },
        ]);

    return pages.filter(page => !isNull(page.team));
};

const Page = mongoose.model('Page', pageSchema);

module.exports = Page;
