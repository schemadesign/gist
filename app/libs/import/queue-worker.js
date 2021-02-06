const queue = require('../../boot/queue-init');
const queueWorkerHelper = require('./queue-worker-helpers');
const processStory = require('./process-story');


queue.worker.process('preImport', (job, done) => queueWorkerHelper.preImport(job, job.data.id, done));
queue.worker.process('scrapeImages', (job, done) => queueWorkerHelper.scrapeImages(job, job.data.id, [], done));
queue.worker.process('importProcessed', (job, done) => queueWorkerHelper.importProcessed(job, job.data.id, done));
queue.worker.process('postImport', (job, done) => queueWorkerHelper.postImport(job, job.data.id, done));
queue.worker.process('processStory', processStory);
