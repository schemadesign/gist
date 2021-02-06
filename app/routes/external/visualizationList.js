const winston = require('winston');
const express = require('express');
const { appendTokenToRequest, loginWithToken } = require('../../utils/auth');

const router = express.Router();

const visualizationList = (req, res) => {
    try {
        return res.redirect('/dashboard/dataset/list');
    } catch (error) {
        winston.error(error);

        return res.status(404).render('error', {});
    }
};

router.get('/', appendTokenToRequest, loginWithToken, visualizationList);

module.exports = router;
