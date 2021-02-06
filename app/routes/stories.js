var express = require('express');
var router = express.Router();

var Story = require('../models/stories');


router.get('/:story', function(req, res, next) {
    var storyId = req.params.story;

    Story.findById(storyId)
        .populate('createdBy')
        .populate('datasourceDescription')
        .populate('sharedPages')
        .exec(function(err, story) {
            if (err) {
                return next(err);
            }
            if (!story) {
                return next(new Error('Couldn\'t find story'));
            }
            res.render('team/presentation', story);
        });
});

module.exports = router;
