import request from 'supertest';
import mockDate from 'mockdate';

import app from '../../../app';
import { hydrateDb, getId, loginAndGetSessionCookie } from '../../../internals/testing/backend/utils';
import { user2, user1, superUser, editorUser, viewerUser, articleEditorUser,
    jsonEditorUser, jsonViewerUser } from '../../../internals/testing/backend/fixtures/users';
import { pokemon1, privateVizWithEditor, allDataTypesJson, publicDataset } from '../../../internals/testing/backend/fixtures/datasets';

const pokemon1Id = getId(pokemon1);
const publicDatasetId = getId(publicDataset);
const allDataTypesJsonId = getId(allDataTypesJson);


describe('Dataset download', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    describe('"Pokemon 1" (CSV, private, glitter team)', () => {
        it('should send proper headers for original', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const { headers } = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(headers).toMatchObject({
                'content-disposition': 'attachment;filename=pokemonGO.csv',
                'content-type': 'text/csv',
            });
        });

        it('should send proper headers for modified', async () => {
            mockDate.set(1527088983000);

            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const { headers } = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            mockDate.reset();

            expect(headers).toMatchObject({
                'content-disposition': 'attachment;filename=edited-1527088983000-pokemonGO.csv',
                'content-type': 'text/csv',
            });
        });

        it('should return 403 when trying to download original as unathorized user', async () => {
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=original`);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download modified as unathorized user', async () => {
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=modified`);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download original as non-team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user2);
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download modified as non-team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user2);
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download original as non-viewing and non-editing team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, articleEditorUser);
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download modified as non-viewing and non-editing team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, articleEditorUser);
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should download original as team admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as team admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download original as super admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as super admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const response = await appRequest
                .get(`/api/dataset/download/${pokemon1Id}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });
    });

    describe('"Private Viz With Editor" (CSV, private, user team)', () => {
        it('should download original as editor', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, editorUser);
            const response = await appRequest
                .get(`/api/dataset/download/${getId(privateVizWithEditor)}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as editor', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, editorUser);
            const response = await appRequest
                .get(`/api/dataset/download/${getId(privateVizWithEditor)}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download original as viewer', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, viewerUser);
            const response = await appRequest
                .get(`/api/dataset/download/${getId(privateVizWithEditor)}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as viewer', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, viewerUser);
            const response = await appRequest
                .get(`/api/dataset/download/${getId(privateVizWithEditor)}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });
    });

    describe('"All Data Types" (JSON, private, glitter team)', () => {
        it('should send proper headers for original', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const { headers } = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(headers).toMatchObject({
                'content-disposition': 'attachment;filename=allDataTypes.json',
                'content-type': 'application/json',
            });
        });

        it('should send proper headers for modified', async () => {
            mockDate.set(1527088983000);

            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const { headers } = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            mockDate.reset();

            expect(headers).toMatchObject({
                'content-disposition': 'attachment;filename=edited-1527088983000-allDataTypes.json',
                'content-type': 'application/json',
            });
        });

        it('should return 403 when trying to download original as unathorized user', async () => {
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=original`);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download modified as unathorized user', async () => {
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=modified`);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download original as non-team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user2);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download modified as non-team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user2);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download original as non-viewing and non-editing team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, articleEditorUser);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should return 403 when trying to download modified as non-viewing and non-editing team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, articleEditorUser);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(403);
            expect(response).toMatchSnapshot();
        });

        it('should download original as team admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as team admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download original as super admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as super admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download original as editor', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, jsonEditorUser);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as editor', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, jsonEditorUser);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download original as viewer', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, jsonViewerUser);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as viewer', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, jsonViewerUser);
            const response = await appRequest
                .get(`/api/dataset/download/${allDataTypesJsonId}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });
    });

    describe('"Public Dataset" (CSV, public, user team)', () => {
        it('should download original as unathorized user', async () => {
            const response = await appRequest
                .get(`/api/dataset/download/${publicDatasetId}?originalOrModified=original`);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as unathorized user', async () => {
            const response = await appRequest
                .get(`/api/dataset/download/${publicDatasetId}?originalOrModified=modified`);

            expect(response).toMatchSnapshot();
        });

        it('should download original as non-team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .get(`/api/dataset/download/${publicDatasetId}?originalOrModified=original`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should download modified as non-team member', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .get(`/api/dataset/download/${publicDatasetId}?originalOrModified=modified`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });
    });

    it('should return 404 status when dataset id not in database', async () => {
        const response = await appRequest
            .get('/api/dataset/download/5a42c26e303770207ce8f84c?originalOrModified=original');

        expect(response).toMatchSnapshot();
    });

    it('should download a modified dataset that was imported via API connection', async () => {
        const response = await appRequest
            .get('/api/dataset/download/5b07033050f5c886278b6d2d?originalOrModified=modified');

        expect(response).toMatchSnapshot();
    });
});
