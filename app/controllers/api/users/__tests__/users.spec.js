import request from 'supertest';
import jwt from 'jsonwebtoken';

import app from '../../../../../app';
import { hydrateDb, loginAndGetSessionCookie } from '../../../../../internals/testing/backend/utils';
import { apiKey1 } from '../../../../../internals/testing/backend/fixtures/apiKeys';
import {
    user1,
    user2,
    jsonEditorUser,
    superUser,
    hackyUser,
} from '../../../../../internals/testing/backend/fixtures/users';
import { team1 } from '../../../../../internals/testing/backend/fixtures/teams';
import { allDataTypesJson } from '../../../../../internals/testing/backend/fixtures/datasets';
import Token from '../../../../models/tokens';
import User from '../../../../models/users';
import DatasourceDescription from '../../../../models/descriptions';


describe('Users', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    describe('authToken', () => {
        it('should return token', async () => {
            jest.spyOn(jwt, 'sign');

            const response = await appRequest
                .post('/api/user/authToken')
                .set('Origin', 'http://local.test.co')
                .send({ key: apiKey1.key });

            expect(jwt.sign).toHaveBeenCalledWith({ userId: apiKey1.user }, expect.any(String), { expiresIn: '24h' });
            expect(response.statusCode).toBe(200);

            const { body = {} } = response;
            const token = await Token.findOne({ apiKey: apiKey1._id });
            expect(token).toMatchObject({ token: expect.any(String), usedAt: null, apiKey: apiKey1._id });
            expect(body).toMatchObject({ token: expect.any(String) });
        });

        it('should return error when missing origin', async () => {
            const response = await appRequest
                .post('/api/user/authToken');

            expect(response.statusCode).toBe(400);

            const { body = {} } = response;

            expect(body.error).toBe('Missing origin');
        });

        it('should return error when missing api key in request', async () => {
            const response = await appRequest
                .post('/api/user/authToken')
                .set('Origin', 'http://local.test.co');

            expect(response.statusCode).toBe(400);

            const { body = {} } = response;

            expect(body.error).toBe('Missing api key');
        });

        it('should return error when api key does not exist in db', async () => {
            const response = await appRequest
                .post('/api/user/authToken')
                .set('Origin', 'http://local.test.co')
                .send({ key: 'fakeApiKey' });

            expect(response.statusCode).toBe(400);

            const { body = {} } = response;

            expect(body.error).toBe('Api key does not exist in db or is inactive');
        });

        it('should return error when domain not exist in db', async () => {
            const response = await appRequest
                .post('/api/user/authToken')
                .set('Origin', 'fake.domain.com')
                .send({ key: apiKey1.key });

            expect(response.statusCode).toBe(400);

            const { body = {} } = response;

            expect(body.error).toBe('This domain is not authorised.');
        });

        it('should return same token as on entry if token is not outdated', async () => {
            const token = jwt.sign({ userId: apiKey1.user }, process.env.SESSION_SECRET, { expiresIn: '24h' });

            await Token.create({ token, apiKey: apiKey1._id });

            const response = await appRequest
                .post('/api/user/authToken')
                .set('Origin', 'http://local.test.co')
                .send({ key: apiKey1.key, token });

            const { body = {} } = response;

            expect(body.token).toEqual(token);
        });

        it('should renew token when is outadted', async () => {
            const outdatedToken = jwt.sign({ userId: apiKey1.user }, process.env.SESSION_SECRET, { expiresIn: 0 });

            await Token.create({ token: outdatedToken, apiKey: apiKey1._id });

            const response = await appRequest
                .post('/api/user/authToken')
                .set('Origin', 'http://local.test.co')
                .send({ key: apiKey1.key, token: outdatedToken });

            expect(jwt.sign).toHaveBeenCalledWith({ userId: apiKey1.user }, expect.any(String), { expiresIn: '24h' });
            expect(response.statusCode).toBe(200);

            const { body = {} } = response;
            expect(body).toMatchObject({ token: expect.any(String) });
        });
    });

    describe('delete', () => {
        it('should not allow to perform action when not an admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, jsonEditorUser);
            const response = await appRequest
                .delete(`/api/user/${jsonEditorUser._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should not allow to perform action when user doesn\'t belong to the team', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .delete(`/api/user/${user2._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should not allow to remove team admin', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .delete(`/api/user/${user1._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should remove user from the team', async () => {
            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            const response = await appRequest
                .delete(`/api/user/${jsonEditorUser._id}`)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();

            const user = await User.findById(jsonEditorUser._id);
            expect(user._team).not.toEqual(expect.arrayContaining([team1._id]));
        });

        it('should unset data ownership', async () => {
            const datasetBefore = await DatasourceDescription.findById(allDataTypesJson._id);
            expect(datasetBefore.updatedBy).toEqual(jsonEditorUser._id);

            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            await appRequest
                .delete(`/api/user/${jsonEditorUser._id}`)
                .set('Cookie', sessionCookie);

            const datasetAfter = await DatasourceDescription.findById(allDataTypesJson._id);
            expect(datasetAfter.updatedBy).toEqual(user1._id);
        });

        it('should unset user permissions', async () => {
            const userBefore = await User.findById(jsonEditorUser._id);
            expect(userBefore._editors).toEqual(expect.arrayContaining([allDataTypesJson._id]));

            const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
            await appRequest
                .delete(`/api/user/${jsonEditorUser._id}`)
                .set('Cookie', sessionCookie);

            const userAfter = await User.findById(jsonEditorUser._id);
            expect(userAfter._editors).not.toEqual(expect.arrayContaining([allDataTypesJson._id]));
        });

        it('should remove inactive user', async () => {
            const userBefore = await User.findById(hackyUser._id);
            expect(userBefore.activated).toBe(false);

            const sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            await appRequest
                .delete(`/api/user/${hackyUser._id}`)
                .set('Cookie', sessionCookie);

            const userAfter = await User.findById(hackyUser._id);
            expect(userAfter).toBe(null);
        });
    });
});
