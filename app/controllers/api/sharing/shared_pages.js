const URL = require('url');
const winston = require('winston');
const qs = require('qs');

const SharedPage = require('./../../../models/shared_pages');
const Description = require('./../../../models/descriptions');
const { first } = require('lodash');
const { VIEW_TYPES } = require('../../../../config/view-types');

/**
 * Processes share object and detects shared page params (pageType, viewType, query, dataset, subdomain)
 * @param {Object} shareObject - object with url of a shared page and optional additional params (e.g. renderingOptions)
 */
async function processShareObject({ url, ...params }) {
    const { pathname, search, hostname } = URL.parse(url, true);
    const query = qs.parse(search.substr(1));
    const subdomain = first(hostname.split('.'));
    const arrayViewRegex = new RegExp(`^/([a-zA-Z0-9_-]*)/(${VIEW_TYPES.join('|')})$`);
    const existingShareRegex = /^\/s\/([0-9a-fA-F]{24})(\/[0-9a-fA-F]{24})?$/;
    const objectDetailsRegex = /^\/([a-zA-Z0-9_-]*)\/([0-9a-fA-F]{24})$/;
    const isPublic = true;
    let whole, _id, datasetUid, rowObjectId, viewType;

    if (arrayViewRegex.test(pathname)) {
        [whole, datasetUid, viewType] = pathname.match(arrayViewRegex);
        const dataset = await Description.findByUidAndTeamSubdomain(datasetUid, subdomain);

        return {
            subdomain,
            dataset: dataset._id,
            isPublic,
            pageType: 'array_view',
            viewType,
            query,
            renderingOptions: params.renderingOptions,
        };
    }

    if (existingShareRegex.test(pathname)) {
        [whole, _id, rowObjectId] = pathname.match(existingShareRegex);
        const { dataset } = await SharedPage.findById(_id).populate('dataset');

        if (rowObjectId) {
            return {
                subdomain,
                dataset: dataset._id,
                isPublic,
                pageType: 'object_details',
                rowObjectId: rowObjectId.substr(1),
                renderingOptions: params.renderingOptions,
            };
        }

        return { subdomain, _id, isPublic };
    }

    if (objectDetailsRegex.test(pathname)) {
        [whole, datasetUid, rowObjectId] = pathname.match(objectDetailsRegex);
        const dataset = await Description.findByUidAndTeamSubdomain(datasetUid, subdomain);

        return {
            subdomain,
            dataset: dataset._id,
            isPublic,
            pageType: 'object_details',
            rowObjectId,
            renderingOptions: params.renderingOptions,
        };
    }

    const dataset = await Description.findByUidAndTeamSubdomain(pathname.split('/')[1], subdomain);

    return {
        ...params,
        subdomain,
        query,
        other: params.other,
        dataset: dataset._id,
        isPublic,
    };
}

module.exports.processShareObject = processShareObject;

/**
 * Fetches existing shared page or creates new one given a share object
 * @param {Object} shareObject - object with url of a shared page and optional additional params (e.g. renderingOptions)
 */
async function getSharedPageFromShareObject(shareObject) {
    let sharedPage;
    const data = await processShareObject(shareObject);
    const protocol = process.env.USE_SSL === 'true' ? 'https' : 'http';

    if (data._id) {
        sharedPage = await SharedPage.findById(data._id).lean();
    } else {
        sharedPage = (await new SharedPage(data).save()).toObject();
    }

    const subdomain = process.env.HOST.includes(data.subdomain) ? '' : `${data.subdomain}.`;
    const url = `${protocol}://${subdomain}${process.env.HOST}/s/${sharedPage._id}`;

    return {
        ...sharedPage,
        subdomain: data.subdomain,
        isPublic: !!data.isPublic,
        url,
    };
}

module.exports.getSharedPageFromShareObject = getSharedPageFromShareObject;

/**
 * Controller for POST method on /share route
 * @param {Object} req - Express request object, req.body is a share object
 * @param {Object} res - Express response object
 */
module.exports.postShare = async function (req, res) {
    try {
        const { _id: share_id, url: share_url } = await getSharedPageFromShareObject(req.body);

        return res.json({ share_url, share_id });
    } catch (err) {
        winston.error(err);
        return res.status(500).send({ error: 'An error occurred when trying to share a page.' });
    }
};
