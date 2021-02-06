const { NOT_MODIFIED: STATUS_NOT_MODIFIED, OK: STATUS_OK } = require('http-status-codes');
const { repeat } = require('lodash');

const queueHelpers = require('../index-queue');
const queueInit = require('../../../../boot/queue-init');
const { RequestError } = require('../../../../libs/system/errors');
const saveHelpers = require('../save-helpers');

import { hydrateDb, getId } from '../../../../../internals/testing/backend/utils';
import { user1 } from '../../../../../internals/testing/backend/fixtures/users';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';
import Descriptions from '../../../../models/descriptions';


const pokemon1Id = getId(pokemon1);

// Mock queue-init
jest.genMockFromModule('../../../../boot/queue-init');
jest.mock('../../../../boot/queue-init');
queueInit.initJob = jest.fn((datasetId, jobName, cb) => cb(null));

describe('Queue dataset methods', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('preImport', () => {
        it('should update dataset description property', async () => {
            const response = await queueHelpers.preImport(user1, pokemon1Id);
            expect(response.statusCode).toBe(200);
            expect(response.data).toBe('ok');
            // Check if DB is updated.
            const {
                lastImportInitiatedBy: importedBy,
                lastImportTriggeredBy: triggerName,
            } = await Descriptions.findById(pokemon1Id);
            expect(triggerName).toBe('manual');
            expect(importedBy.toString()).toBe(user1._id.toString());
            expect(queueInit.initJob.mock.calls[0].slice(0, 2)).toEqual(['5a42c26e303770207ce8f83b', 'preImport']);
        });
    });

    describe('importProcessed', () => {
        it('should update dataset description property', async () => {
            const response = await queueHelpers.importProcessed(user1, pokemon1Id);
            expect(response.statusCode).toBe(200);
            expect(response.data).toBe('ok');
            // Check if DB is updated.
            const {
                lastImportInitiatedBy: importedBy,
                lastImportTriggeredBy: triggerName,
            } = await Descriptions.findById(pokemon1Id);
            expect(triggerName).toBe('manual');
            expect(importedBy.toString()).toBe(user1._id.toString());
            expect(queueInit.initJob.mock.calls[0].slice(0, 2)).toEqual(['5a42c26e303770207ce8f83b', 'importProcessed']);
        });
    });

    describe('scrapeImages', () => {
        it('should update dataset description property', async () => {
            const response = await queueHelpers.scrapeImages(user1, pokemon1Id);
            expect(response.statusCode).toBe(200);
            expect(response.data).toBe('ok');
            // Check if DB is updated.
            const {
                lastImportInitiatedBy: importedBy,
                lastImportTriggeredBy: triggerName,
            } = await Descriptions.findById(pokemon1Id);
            expect(triggerName).toBe('manual');
            expect(importedBy.toString()).toBe(user1._id.toString());
            expect(queueInit.initJob.mock.calls[0].slice(0, 2)).toEqual(['5a42c26e303770207ce8f83b', 'scrapeImages']);
        });
    });

    describe('postImport', () => {
        it('should update dataset description property', async () => {
            const response = await queueHelpers.postImport(user1, pokemon1Id);
            expect(response.statusCode).toBe(200);
            expect(response.data).toBe('ok');
            // Check if DB is updated.
            const {
                lastImportInitiatedBy: importedBy,
                lastImportTriggeredBy: triggerName,
            } = await Descriptions.findById(pokemon1Id);
            expect(triggerName).toBe('manual');
            expect(importedBy.toString()).toBe(user1._id.toString());
            expect(queueInit.initJob.mock.calls[0].slice(0, 2)).toEqual(['5a42c26e303770207ce8f83b', 'postImport']);
        });
    });

    describe('startJob', () => {
        it('should throw on incorrect dataset', async () => {
            try {
                const fakeId = repeat('0', 24);
                await queueHelpers.startJob(fakeId);
            } catch (result) {
                expect(result).toBeInstanceOf(RequestError);
            }
        });

        it('should return not_modified when job already started', async () => {
            await Descriptions.findByIdAndUpdate(pokemon1Id, { jobId: 1 });

            const result = await queueHelpers.startJob(pokemon1Id);

            expect(result).toBe(STATUS_NOT_MODIFIED);
        });

        it('should throw when no job was started', async () => {
            saveHelpers.startJobIfNeeded = jest.fn().mockResolvedValue(null);

            try {
                await queueHelpers.startJob(pokemon1Id);
            } catch (result) {
                expect(result).toBeInstanceOf(RequestError);
            }
        });

        it('should save job and return ok', async () => {
            saveHelpers.startJobIfNeeded = jest.fn().mockResolvedValue(5);

            const result = await queueHelpers.startJob(pokemon1Id);

            expect(result).toBe(STATUS_OK);

            const dataset = await Descriptions.findById(pokemon1Id);

            expect(dataset.jobId).toBe(5);
        });
    });
});
