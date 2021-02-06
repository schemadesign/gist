import request from 'supertest';

import { hydrateDb, loginAndGetSessionCookie } from '../../../../internals/testing/backend/utils';
import { visualizationEditor } from '../../../../internals/testing/backend/fixtures/users';
import { token as tokenItem } from '../../../../internals/testing/backend/fixtures/tokens';
import app from '../../../../app';

describe('newVisualization', () => {
    let appRequest, sessionCookie;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
        sessionCookie = await loginAndGetSessionCookie(appRequest, visualizationEditor);
    });

    it('should redirect to visualization create page', async () => {
        const response = await appRequest
            .get(`/create-visualization?token=${tokenItem.token}`)
            .set('referer', 'local.test.co');

        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/dashboard/dataset/new');
    });

    it('should redirect to login page if token is not provided', async () => {
        const response = await appRequest
            .get('/create-visualization')
            .set('referer', 'local.test.co');

        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/auth/login');
    });
});
