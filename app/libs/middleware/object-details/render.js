const { mongoose: { Types: { ObjectId } } } = require('../../../models/mongoose_client');
const winston = require('winston');

const controller = require('../../../controllers/client/data_preparation/object_details');

module.exports.render = function (req, res, next) {

    // @todo: we can do more refactoring here, including splitting apart the page
    // render from the DataPrep. But since it's just one object it's not as important
    // to do that right away.

    // objectId may come from req.objectId (shared page) or from params (normal object details route)
    var objectId = req.objectId || req.params.object_id;

    // bail out if there's no objectId and this is a shared page and the pageType doesn't match
    if (!objectId && req.sharedPage.isSharedPage && req.sharedPage.doc.pageType !== 'object_details') {
        return next();
    }

    if (!ObjectId.isValid(objectId)) {
        return next();
    }

    controller.BindData(req, req.sourceKey, objectId, req.preview.isPreview, req.revision, function (err, bindData) {

        if (err) {
            winston.error('Error getting bind data for Array source_key ' + req.sourceKey + ' object ' + objectId + ' details: ', err);
            return next(err);
            // return res.status(500).send(err.response || 'Internal Server Error');
        }
        if (bindData === null) { // 404
            return res.status(404).send(err.response || 'Not Found');
        }

        winston.debug('bindData ready, rendering page');
        res.render('object/show', bindData);
    });
};
