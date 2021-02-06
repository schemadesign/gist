import request from 'supertest';

import { hydrateDb, loginAndGetSessionCookie } from '../../../../internals/testing/backend/utils';
import { visualizationEditor } from '../../../../internals/testing/backend/fixtures/users';
import { token as tokenItem } from '../../../../internals/testing/backend/fixtures/tokens';
import app from '../../../../app';

describe('visualizationList', () => {
    let appRequest, sessionCookie;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
        sessionCookie = await loginAndGetSessionCookie(appRequest, visualizationEditor);
    });

    it('should redirect to visualization list page', async () => {
        const response = await appRequest
            .get(`/visualization-list?token=${tokenItem.token}`)
            .set('referer', 'local.test.co');

        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/dashboard/dataset/list');
    });

    it('should redirect to login page if token is not provided', async () => {
        const response = await appRequest
            .get('/visualization-list')
            .set('referer', 'local.test.co');

        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/auth/login');
    });
});
