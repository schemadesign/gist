const winston = require('winston');
const express = require('express');
const { appendTokenToRequest, loginWithToken } = require('../../utils/auth');

const router = express.Router();

const createVisualization = (req, res) => {
    try {
        return res.redirect('/dashboard/dataset/new');
    } catch (error) {
        winston.error(error);

        return res.status(404).render('error', {});
    }
};

router.get('/', appendTokenToRequest, loginWithToken, createVisualization);

module.exports = router;
