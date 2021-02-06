var winston = require('winston');

var Story = require('../../../models/stories');

module.exports.addStories = function (req, res, next) {

    var findQuery = {
        $and: [
            { datasourceDescription: req.sourceDoc.primaryKey },
            {
                $or: [
                    { isPublic: true },
                    { isPublic: { $exists: false } }
                ]
            }
        ]
    };

    Story.find(findQuery)
        .deepPopulate('sharedPages')
        .exec(function (err, stories) {
            if (err) {
                winston.error('Error finding stories to count: ', err);
                req.storiesCount = 0;
                req.stories = [];
                return next(err);
            }

            req.storiesCount = stories.length;
            req.stories = stories;

            winston.debug('added stories & stories count');
            next();
        });
};
