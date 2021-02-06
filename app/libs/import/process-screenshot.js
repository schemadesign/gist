const { omit } = require('lodash');
var winston = require('winston');

const { getSharedPageFromShareObject } = require('../../controllers/api/sharing/shared_pages');
const { getScreenshot } = require('./screenshot-helpers');
const Story = require('../../models/stories');

async function processScreenshot(sharedPage, response) {
    try {
        const shared = await getSharedPageFromShareObject(sharedPage);
        const options = omit(sharedPage, 'url');
        const image = await getScreenshot(shared, options);

        winston.info('Created screenshot');

        return response.status(200).json(image);
    } catch (err) {
        const message = 'An error occurred while generating screenshot';

        winston.error(message, err);

        return response.status(400).json({error: message});
    }
}

module.exports = processScreenshot;
