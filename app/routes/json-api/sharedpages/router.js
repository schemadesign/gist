const { Router } = require('express');
const { stringify } = require('qs');
const router = Router();

const storiesCtrl = require('../../../controllers/api/sharing/stories');
const sharedPagesCtrl = require('../../../controllers/api/sharing/shared_pages');
const { addSharedPage } = require('../../../libs/middleware/views/add-shared-page');

router.get('/sharedpages/:shared_page_id', addSharedPage, function ({ apiVersion, sourceKey, viewType, query }, res, next) {
    res.redirect(`/json-api/${apiVersion}/datasources/${sourceKey}/views/${viewType}/graph-data?${stringify(query)}`);
});

router.post('/share', sharedPagesCtrl.postShare);

router.post('/story', storiesCtrl.postStory);

router.post('/screenshot', storiesCtrl.postBuildScreenshot);

module.exports = router;
