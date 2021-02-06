const { get } = require('lodash');

const { getSharedPageFromShareObject } = require('../../controllers/api/sharing/shared_pages');
const { saveScreenshots } = require('./screenshot-helpers');
const Story = require('../../models/stories');


async function processStory(job, done) {
    try {
        const sharedPages = await Promise.all(job.data.sharedPages.map(getSharedPageFromShareObject));

        await saveScreenshots(sharedPages);

        const story = await new Story({
            ...job.data,
            createdBy: job.data.user,
            sharedPages: sharedPages.map(sharedPage => sharedPage._id),
            isPublic: sharedPages.every(sharedPage => sharedPage.isPublic),
            datasourceDescription: get(sharedPages, [0, 'dataset']),
        }).save();

        done(null, `Story ${story._id} has been saved`);

        return story;
    } catch (err) {
        done(err);
    }
}

module.exports = processStory;
