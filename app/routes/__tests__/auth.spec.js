import request from 'supertest';
import jwt from 'jsonwebtoken';

import app from '../../../app';
import { hydrateDb } from '../../../internals/testing/backend/utils';
import { expiredToken, token, teamToken } from '../../../internals/testing/backend/fixtures/tokens';

describe('Auth', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    describe('login/:token', () => {
        it('should log user', async () => {
            jest.spyOn(jwt, 'verify');

            const response = await appRequest
                .get(`/auth/login/${token.token}`)
                .set('referer', 'local.test.co');

            expect(response.header.location).toBe('/dashboard');
            expect(jwt.verify).toHaveBeenCalledWith(token.token, expect.any(String));
        });

        it('should not log user with not existing token', async () => {
            const response = await appRequest
                .get('/auth/login/notExistingToken')
                .set('referer', 'local.test.co');

            expect(response.header.location).toBe('/auth/login');
        });

        it('should not log user with expired token', async () => {
            jest.spyOn(jwt, 'verify');

            const response = await appRequest
                .get(`/auth/login/${expiredToken.token}`)
                .set('referer', 'local.test.co');

            expect(response.header.location).toBe('/auth/login');
            expect(jwt.verify).toHaveBeenCalledWith(expiredToken.token, expect.any(String));
        });

        it('should not log user when not match team from apiKey', async () => {
            const response = await appRequest
                .get(`/auth/login/${teamToken.token}`)
                .set('referer', 'local.test.co');

            expect(response.header.location).toBe('/auth/login');
        });
    });
});
