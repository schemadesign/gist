import request from 'supertest';

import { hydrateDb, loginAndGetSessionCookie } from '../../../internals/testing/backend/utils';
import { user1 } from '../../../internals/testing/backend/fixtures/users';
import app from '../../../app';


describe('Routing Index', () => {
    let appRequest, sessionCookie;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
        sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
    });

    it('should redirect to root domain if dashboard requested from team domain', async () => {
        const response = await appRequest
            .get('/dashboard')
            .set('Cookie', sessionCookie)
            .set('Host', `someteam.${process.env.HOST}`);

        expect(response.status).toBe(302);
        expect(response.header.location).toBe(`http://app.${process.env.HOST}/dashboard`);
    });

    it('should return status code 200 when dashboard requested from root domain', async () => {
        const response = await appRequest
            .get('/dashboard')
            .set('Cookie', sessionCookie)
            .set('Host', `app.${process.env.HOST}`);

        expect(response.status).toBe(200);
    });
});
