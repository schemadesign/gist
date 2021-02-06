import request from 'supertest';

import { hydrateDb, loginAndGetSessionCookie } from '../../../../internals/testing/backend/utils';
import { visualizationEditor } from '../../../../internals/testing/backend/fixtures/users';
import { token as tokenItem } from '../../../../internals/testing/backend/fixtures/tokens';
import app from '../../../../app';

describe('editVisualization', () => {
    let appRequest, sessionCookie;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
        sessionCookie = await loginAndGetSessionCookie(appRequest, visualizationEditor);
    });

    it('should redirect to visualization edit page', async () => {
        const uid = 'pokemon';
        const chartType = 'area-chart';
        const subdomain = 'glitter';

        const response = await appRequest
            .get(`/edit-visualization?uid=${uid}&chartType=${chartType}&subdomain=${subdomain}&token=${tokenItem.token}`)
            .set('referer', 'local.test.co');

        expect(response.status).toBe(302);
        expect(response.header.location)
            .toBe('/dashboard/dataset/5a42c26e303770207ce8f83b/views/areaChart');
    });

    it('should redirect to login page if token is not provided', async () => {
        const uid = 'pokemon';
        const chartType = 'area-chart';
        const subdomain = 'glitter';

        const response = await appRequest
            .get(`/edit-visualization?uid=${uid}&chartType=${chartType}&subdomain=${subdomain}`)
            .set('referer', 'local.test.co');

        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/auth/login');
    });

    it('should redirect to 404 if uid is wrong', async () => {
        const uid = 'wrongUid';
        const chartType = 'area-chart';
        const subdomain = 'glitter';

        const response = await appRequest
            .get(`/edit-visualization?uid=${uid}&chartType=${chartType}&subdomain=${subdomain}&token=${tokenItem.token}`)
            .set('referer', 'local.test.co');

        expect(response.status).toBe(404);
    });

    it('should redirect to 404 if uid & subdomain is wrong', async () => {
        const uid = 'wrongUid';
        const chartType = 'area-chart';
        const subdomain = 'wrong-subdomain';

        const response = await appRequest
            .get(`/edit-visualization?uid=${uid}&chartType=${chartType}&subdomain=${subdomain}&token=${tokenItem.token}`)
            .set('referer', 'local.test.co');

        expect(response.status).toBe(404);
    });
});
