var express = require('express');
var router = express.Router();
const slowDown = require('../../utils/slowDown');


const slowAfterReloads = 15;
const windowTime = 1 * 60 * 1000; //1 minute

// @todo: auth for json-api?

router.use('/', slowDown(slowAfterReloads, windowTime), require('./datasources/router'));
router.use('/', slowDown(slowAfterReloads, windowTime), require('./sharedpages/router'));


module.exports = router;
