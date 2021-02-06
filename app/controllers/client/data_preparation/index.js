const async = require('async');
const { defaultTo, pick, each, get } = require('lodash');
const queryString = require('querystring');

const dataSourceDescriptions = require('../../../models/descriptions');
const raw_source_documents = require('../../../models/raw_source_documents');
const User = require('../../../models/users');
const Story = require('../../../models/stories');
const Page = require('../../../models/pages');
const View = require('../../../models/views');
const func = require('../func');
const viewByHelpers = require('./team/viewByHelpers');
const libraries = require('../../../libs/middleware/views/libraryList');
const { compareCreatedAt } = require('./data_prep_helpers/sort.helpers');

const INSIGHTS_LIMIT = 10;
const VISUALIZATION_LIMIT = 18;

const constructQueryString = (dataset) => {
    const query = defaultTo(dataset.fe_filters.default, {});

    if (dataset.importRevision > 1) {
        query.revision = dataset.importRevision;
    }

    return queryString.stringify(query);
};

const getDefaultView = ({ fe_views, _team }) =>
    defaultTo(_team.isEnterprise ? _team.subdomain : fe_views.default_view, 'gallery');

// TODO: We should refactor pagination and tabs for this view. Right now we are using tabs from bootstrap and pagination
//  as a normal links which cause reload on pagination and on tabs no what is not consistent. We should download data
//  depends on chosen tab and pagination.
module.exports.BindData = async.asyncify(
    async (req) => {
        const { teamName, vizName } = req.query;
        const [pages, datasets, user, views] = await Promise.all([
            Page.getShowcasedEntries(),
            dataSourceDescriptions.getShowcasedEntries(vizName, teamName),
            User.findById(req.user).populate('defaultLoginTeam'),
            View.getAllBuiltInViewsAsObject(),
        ]);

        const sortedDataset = datasets
            .map((dataset) => {
                dataset.createdAt = get(dataset, 'previous_datasets[0].createdAt') || dataset.createdAt;
                return dataset;
            })
            .sort((a, b) => compareCreatedAt(b, a));

        const insights = await Story
            .find({
                datasourceDescription: { $in: sortedDataset.map(dataset => dataset._id) },
                $or: [{ isPublic: true }, { isPublic: { $exists: false } }],
            })
            .sort('-createdAt')
            .deepPopulate('sharedPages createdBy datasourceDescription datasourceDescription._team');

        const rawSourceDocuments = await Promise.all(sortedDataset.map(({ _id }) =>
            raw_source_documents.Model.findOne({ primaryKey: _id })));
        const urlProtocol = process.env.USE_SSL === 'true' ? 'https://' : 'http://';
        let rootDomain = defaultTo(process.env.HOST, 'localhost:9080');

        if (process.env.SUBTEAMS) {
            rootDomain = process.env.HOST.replace(`${process.env.SUBDOMAIN}.`, '');
        }

        const viewBy = viewByHelpers.checkForEmptyArticlesOrInsights(
            viewByHelpers.instantiateViewBy(req.path),
            insights.length === 0,
            pages.length === 0,
        );

        // Form the base URL for each Aritcle
        each(pages, (page) => {
            page.baseUrl = `${urlProtocol}${page.team.subdomain}.${rootDomain}`;
        });

        const visualizations = sortedDataset.map((dataset, index) => {
            return {
                ...pick(dataset, ['_id', 'updatedAt', 'createdAt', 'title', 'brandColor', 'description', 'urls', 'banner', 'vizType']),
                key: dataset.uid,
                teamTitle: dataset._team.title,
                subdomain: dataset._team.subdomain,
                admin: dataset._team.admin,
                author: dataset._team.title,
                insightsCount: insights.filter(story => story.datasourceDescription.equals(dataset._id)).length,
                view_visibility: func.mergeViewDisplayNamesIntoDatasourceDescription(dataset.fe_views.views, views),
                baseUrl: `${urlProtocol}${dataset._team.subdomain}.${rootDomain}`,
                query: constructQueryString(dataset),
                default_view: getDefaultView(dataset),
                sourceDoc: rawSourceDocuments[index],
                vizType: dataset.vizType,
                globalLibraries: [
                    ...libraries.JAVASCRIPT,
                ],
            };
        });

        const pageNumber = req.query.page ? parseInt(req.query.page, 10) : 1;
        // Paginate datasets
        const paginatedVisualizations = paginateData(visualizations, viewBy.visualizations, VISUALIZATION_LIMIT, pageNumber);
        const paginatedInsights = paginateData(insights, viewBy.insights, INSIGHTS_LIMIT, pageNumber);

        return {
            env: pick(process.env, ['NODE_ENV', 'FE_LIVERELOAD', 'FE_UNPROCESSEDCSS', 'AUTH_PROTOCOL', 'DO_S3_BUCKET', 'MIXPANEL_TOKEN', 'HIDE_BUSINESS_LINKS', 'GOOGLE_ANALYTICS_ID']),
            user,
            visualizations: paginatedVisualizations,
            insights: paginatedInsights,
            articles: pages,
            filterObj: func.filterObjFromQueryParams(req.query),
            routePath_base: '/',
            displayTitleOverrides: { vizName: 'Visualization', teamName: 'Team' },
            totalVizPages: Math.ceil(visualizations.length / VISUALIZATION_LIMIT),
            totalInsightsPages: Math.ceil(insights.length / INSIGHTS_LIMIT),
            currentVizPage: viewBy.visualizations ? pageNumber : 1,
            currentInsightsPage: viewBy.insights ? pageNumber : 1,
            viewBy,
            has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
            globalLibraries: [
                ...libraries.JAVASCRIPT,
            ],
        };
    },
);

function paginateData(data, current, limit, page) {
    const pageNumber = current ? page : 1;
    const skipNResults = limit * (Math.max(pageNumber, 1) - 1);
    if (Array.isArray(data)) {
        const paginatedData = data.slice(skipNResults, skipNResults + limit);

        return paginatedData;
    }

    return data;
}
