const User = require('../models/users');

const express = require('express');
const router = express.Router();

router.get('/*', function (req, res) {
    var userId = req.user;
    if (!userId) {
        return res.redirect('/auth/login');
    }

    User.findById(userId)
        .populate('_team')
        .lean()
        .exec(function (err, user) {
            if (err) {
                return res.send(err);
            } else {
                if (!user) {
                    return res.redirect('/auth/login');
                }

                user.team = user._team;

                return res.render('dashboard/index', {
                    env: process.env,
                    user: userId,
                });
            }
        });
});

module.exports = router;
