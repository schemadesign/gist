import request from 'supertest';

import app from '../../../../../app';
import { hydrateDb, loginAndGetSessionCookie } from '../../../../../internals/testing/backend/utils';
import { editorUser, user1, user2, superUser, superUser2 } from '../../../../../internals/testing/backend/fixtures/users';
import { apiKey1, apiKey2 } from '../../../../../internals/testing/backend/fixtures/apiKeys';

describe('ApiKey', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    describe('getKey', () => {
        it('should return API key for valid team id', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .get('/api/apiKey/getKey/')
                .set('Cookie', sessionCookie);
            const { body = {} } = response;

            expect(response.statusCode).toBe(200);
            expect(body.key).toBe(apiKey1.key);
            expect(body.active).toBeTruthy();
        });

        it('should return API key for valid team id and if user is super admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const response = await appRequest
                .get('/api/apiKey/getKey/')
                .set('Cookie', sessionCookie);
            const { body = {} } = response;

            expect(response.statusCode).toBe(200);
            expect(body.key).toBe(apiKey2.key);
            expect(body.active).toBeTruthy();
        });

        it('should return null if key does not exist for team', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user2);
            const response = await appRequest
                .get('/api/apiKey/getKey')
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(200);

            expect(response.body).toMatchSnapshot();
        });

        it('should return 400 if it is not admin or super admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, editorUser);
            const response = await appRequest
                .get('/api/apiKey/getKey')
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);

            expect(response.body).toMatchSnapshot();
        });
    });

    describe('generate', () => {
        it('should generate new key', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user2);

            const response = await appRequest
                .put('/api/apiKey/generate')
                .set('Host', 'local.test.co')
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(200);
            expect(response.body).toMatchSnapshot({
                key: expect.any(String),
                requestDomains: expect.any(Array),
            });
        });

        it('should generate new key if user is super admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser2);

            const response = await appRequest
                .put('/api/apiKey/generate')
                .set('Host', 'local.test.co')
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(200);
            expect(response.body).toMatchSnapshot({
                key: expect.any(String),
                requestDomains: expect.any(Array),
            });
        });


        it('should not allow generate key again if previous key is already generated', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);

            const response = await appRequest
                .put('/api/apiKey/generate')
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('API key is already generated.');
        });

        it('should return 400 when user is not an admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, editorUser);

            const response = await appRequest
                .put('/api/apiKey/generate')
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Only team admin can generate API key.');
        });
    });

    describe('update', () => {
        it('should validate if no apiKey was provided', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);

            const response = await appRequest
                .post('/api/apiKey/update')
                .send({ domains: [], apiKey: null })
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Not enough parameters');
        });

        it('should return 400 when user is not a admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, editorUser);

            const response = await appRequest
                .post('/api/apiKey/update')
                .send({ domains: ['localhost'], apiKey: apiKey1.key })
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('You don\'t have permissions to perform this action.');
        });

        it('should return 400 when domains is not an array', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);

            const response = await appRequest
                .post('/api/apiKey/update')
                .send({ domains: 'notArray', apiKey: apiKey1.key })
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Domains must be an array.');
        });

        it('should return 400 when domains is empty', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);

            const response = await appRequest
                .post('/api/apiKey/update')
                .send({ domains: [], apiKey: apiKey1.key })
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('You need at least one domain.');
        });

        it('should return 400 when domains is not an array of strings', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);

            const response = await appRequest
                .post('/api/apiKey/update')
                .send({ domains: [{ test: 1 }], apiKey: apiKey1.key })
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toBe('Only strings allowed as domains.');
        });

        it('should update the domains in the apiKey', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);

            const response = await appRequest
                .post('/api/apiKey/update')
                .send({ domains: ['domain1', 'domain2'], apiKey: apiKey1.key })
                .set('Cookie', sessionCookie);
            expect(response.statusCode).toBe(200);
        });

        it('should removes duplicates', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .post('/api/apiKey/update')
                .send({ domains: ['domain1', 'domain1', '   domain2 ', 'http://domain3/cos'], apiKey: apiKey1.key })
                .set('Cookie', sessionCookie);

            expect(response.body.requestDomains).toEqual(['domain1', 'domain2', 'domain3']);
        });
    });
});
