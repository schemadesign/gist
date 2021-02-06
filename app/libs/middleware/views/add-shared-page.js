const winston = require('winston');
const path = require('path');

const SharedPage = require('../../../models/shared_pages');

module.exports.addSharedPage = function (req, res, next) {
    const sharedPage = {
        isSharedPage: false,
    };

    if (!req.params.shared_page_id) {

        req.sharedPage = sharedPage;
        winston.debug('not a shared page');
        next();
        return;

    }

    SharedPage.FindOneWithId(req.params.shared_page_id, function (err, doc) {
        if (err) {
            winston.error('Error finding shared page: ', err);
            return next(err);
        }

        if (!doc) {
            winston.error('Error finding shared page: no doc found');
            return next(new Error('No doc found'));
        }

        if (!doc.dataset) {
            winston.error('Error finding shared page: no dataset found');
            return next(new Error('No Dataset Found'));
        }

        const query = {};

        doc.query = req.query.queryFilters ? {} : doc.query;
        Object.assign(query, doc.query, req.query);

        if (doc.pageType !== 'array_view' && doc.pageType !== 'object_details') {
            winston.debug('custom view');
            try {
                let revision = '';
                if (doc.dataset.importRevision > 1) {
                    revision = '?revision=' + doc.dataset.importRevision;
                }
                const customViewFileLocation = path.join(__dirname, '/../../../../user/', doc.dataset._team.subdomain, '/views/index');
                return res.render(customViewFileLocation, {
                    sourceKey: doc.dataset.uid,
                    mainView: doc.pageType,
                    subView: doc.viewType,
                    query,
                    other: JSON.stringify(doc.other),
                    story: req.query.story,
                    revision,
                    sharedPageId: req.params.shared_page_id,
                    puppeteer: req.puppeteer,
                    puppeteerScreenshot: req.puppeteerScreenshot,
                });
            } catch (e) {
                winston.error(e);
                winston.error('Error finding shared page: wrong pageType');
                return next(new Error('Wrong pageType'));
            }
        }

        // set view type and source key based on sharedpages document
        req.viewType = doc.viewType; // may be null for object_details page
        req.sourceKey = doc.dataset.uid;
        req.objectId = doc.rowObjectId;

        sharedPage.isSharedPage = true;
        sharedPage.sharedPageId = req.params.shared_page_id;
        sharedPage.doc = doc;

        req.sharedPage = sharedPage;
        req.query = query;

        winston.debug('found shared page');
        next();
    });

};
