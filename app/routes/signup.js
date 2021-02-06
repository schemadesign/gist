const express = require('express');
const router = express.Router();

router.get('/*', function(req, res) {
    res.render('signup/index', {
        env: process.env,
        has_google_analytics: !!process.env.GOOGLE_ANALYTICS_ID,
    });
});


module.exports = router;
