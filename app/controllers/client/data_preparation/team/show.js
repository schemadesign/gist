const async = require('async');
const { omit, each, orderBy, get } = require('lodash');
const queryString = require('querystring');
const ObjectId = require('mongodb').ObjectID;

const raw_source_documents = require('../../../../models/raw_source_documents');
const User = require('../../../../models/users');
const Story = require('../../../../models/stories');
const View = require('../../../../models/views');
const func = require('../../func');
const viewByHelpers = require('./viewByHelpers');
const libraries = require('../../../../libs/middleware/views/libraryList');
const { compareCreatedAt } = require('../data_prep_helpers/sort.helpers');

const INSIGHTS_LIMIT = 10;
const VISUALIZATION_LIMIT = 18;

module.exports.BindData = function (req, teamDescription, callback) {
    var team = omit(teamDescription, 'datasourceDescriptions');
    var storiesArray = [];
    var baseUrl;

    var default_customView;
    if (team.isEnterprise) {
        default_customView = team.subdomain;
    }

    var iterateeFn = async.ensureAsync(function (dataSourceDescription, cb) // prevent stack overflows from this sync iteratee
    {
        raw_source_documents.Model.findOne({
            primaryKey: dataSourceDescription._id,
        }, function (err, doc) {
            if (err) {
                return cb(err, null);
            }
            if (!doc) {
                return cb(err, null);
            }

            // construct the query
            var query = {};
            if (typeof dataSourceDescription.fe_filters.default !== 'undefined') {
                query = dataSourceDescription.fe_filters.default;
            }
            if (dataSourceDescription.importRevision > 1) {
                query.revision = dataSourceDescription.importRevision;
            }
            query = queryString.stringify(query);

            var default_view = (default_customView) ? default_customView : 'gallery';
            if (typeof dataSourceDescription.fe_views.default_view !== 'undefined' && !default_customView) {
                default_view = dataSourceDescription.fe_views.default_view;
            }

            const formatName = ({ firstName = '', lastName = '' }) => `${firstName} ${lastName}`.trim();

            var updatedByDisplayName = formatName(dataSourceDescription.updatedBy || {});
            var authorDisplayName = formatName(dataSourceDescription.author || {});

            const viewsPromise = View.getAllBuiltInViewsAsObject();

            viewsPromise.then(function(views) {
                var sourceDescription = {
                    _id: dataSourceDescription._id,
                    key: dataSourceDescription.uid,
                    sourceDoc: doc,
                    updatedAt: dataSourceDescription.updatedAt,
                    createdAt: dataSourceDescription.createdAt,
                    title: dataSourceDescription.title,
                    brandColor: dataSourceDescription.brandColor || '#005CB5',
                    description: dataSourceDescription.description,
                    urls: dataSourceDescription.urls,
                    lastUpdatedBy: updatedByDisplayName,
                    author: authorDisplayName,
                    query: query,
                    default_view: default_view,
                    banner: dataSourceDescription.banner,
                    view_visibility: func.mergeViewDisplayNamesIntoDatasourceDescription(dataSourceDescription.fe_views.views, views),
                };

                var findQuery = {
                    $and: [
                        { datasourceDescription: dataSourceDescription._id },
                        {
                            $or: [
                                { isPublic: true },
                                { isPublic: { $exists: false } },
                            ],
                        },
                    ],
                };

                if (req.user) {
                    var userId = ObjectId(req.user);
                    var userFindQuery = [
                        {
                            $and: [
                                { isPublic: false },
                                { createdBy: userId },
                            ],
                        },
                    ];

                    findQuery.$and[1].$or = findQuery.$and[1].$or.concat(userFindQuery);
                }

                Story.find(findQuery)
                    .deepPopulate('sharedPages createdBy datasourceDescription datasourceDescription._team')
                    .exec(function (err, stories) {
                        if (err) {
                            return callback(err, null);
                        }

                        if (stories && stories.length > 0) {
                            Array.prototype.push.apply(storiesArray, stories);
                            sourceDescription.storiesCount = stories.length;
                        } else {
                            sourceDescription.storiesCount = 0;
                        }

                        return cb(err, sourceDescription);
                    });
            });

        });
    });

    var completionFn = function (err, sourceDescriptions) {
        var rootDomain = process.env.HOST ? process.env.HOST : 'localhost:9080';
        baseUrl = process.env.USE_SSL === 'true' ? 'https://' : 'http://';

        if (process.env.NODE_ENV !== 'enterprise') {
            baseUrl += teamDescription.subdomain + '.';
        }

        baseUrl += rootDomain;

        // Set viewBy as an object signifying which of the tabs is to be active on page load
        let viewBy = viewByHelpers.instantiateViewBy(req.path);

        // Make sure the defaults view aren't empty
        // If they are then switch the default to visualizations
        viewBy = viewByHelpers.checkForEmptyArticlesOrInsights(viewBy, storiesArray.length === 0, teamDescription.pages.length === 0);

        var filterObj = func.filterObjFromQueryParams(req.query);

        if (process.env.NODE_ENV === 'enterprise' && process.env.SUBTEAMS) {
            baseUrl = baseUrl.replace(process.env.SUBDOMAIN, teamDescription.subdomain);
        }

        sourceDescriptions = sourceDescriptions.filter(function (description) {
            return description !== null;
        });

        each(teamDescription.pages, function (page) {
            page.baseUrl = baseUrl;
        });

        const sortedStories = orderBy(storiesArray, ['createdAt'], ['desc']);

        const pageNumber = req.query.page ? parseInt(req.query.page, 10) : 1;
        // Paginate datasets
        const paginatedVisualizations = paginateData(sourceDescriptions, viewBy.visualizations, VISUALIZATION_LIMIT, pageNumber);
        const paginatedInsights = paginateData(sortedStories, viewBy.insights, INSIGHTS_LIMIT, pageNumber);

        var data = {
            env: process.env,
            visualizations: paginatedVisualizations,
            team,
            baseUrl: baseUrl,
            routePath_base: baseUrl,
            filterObj: filterObj,
            displayTitleOverrides: { vizName: 'Visualization', teamName: 'Team' },
            insights: paginatedInsights,
            viewBy: viewBy || 'visualization',
            articles: teamDescription.pages,
            totalVizPages: Math.ceil(sourceDescriptions.length / VISUALIZATION_LIMIT),
            totalInsightsPages: Math.ceil(storiesArray.length / INSIGHTS_LIMIT),
            currentVizPage: viewBy.visualizations ? pageNumber : 1,
            currentInsightsPage: viewBy.insights ? pageNumber : 1,
            has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
            globalLibraries: [
                ...libraries.JAVASCRIPT,
            ],
        };

        if (req.user) {
            User.findById(req.user)
                .populate('defaultLoginTeam')
                .exec(function (err, user) {
                    if (err) {
                        return callback(err);
                    }
                    data.user = user;
                    callback(err, data);
                });
        } else {
            callback(err, data);
        }
    };

    const datasourceDescriptions = teamDescription.datasourceDescriptions
        .map((dataset) => {
            dataset.createdAt = get(dataset, 'previous_datasets[0].createdAt') || dataset.createdAt;
            return dataset;
        })
        .sort((a, b) => compareCreatedAt(b, a));

    async.map(datasourceDescriptions, iterateeFn, completionFn);
};

function paginateData(data, current, limit, page) {
    const pageNumber = current ? page : 1;
    const skipNResults = limit * (Math.max(pageNumber, 1) - 1);
    if (Array.isArray(data)) {
        const paginatedData = data.slice(skipNResults, skipNResults + limit);

        return paginatedData;
    }

    return data;
}
