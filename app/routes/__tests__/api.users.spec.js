import request from 'supertest';

import app from '../../../app';
import User from '../../../app/models/users';
import Tokens from '../../../app/models/tokens';
import { hydrateDb, insert, getId } from '../../../internals/testing/backend/utils';
import { team2 } from '../../../internals/testing/backend/fixtures/teams';
import jwt from 'jsonwebtoken';
import { apiKey1 } from '../../../internals/testing/backend/fixtures/apiKeys';

describe('Users API', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    describe('Creating a new account', () => {
        it('should create a new user', async () => {
            const token = await insert(Tokens, { token: jwt.sign({ userId: apiKey1.user }, process.env.SESSION_SECRET, { expiresIn: '24h' }) });

            const reqBody = {
                email: 'user+newuser@schemadesign.com',
                provider: 'local',
                tokenId: token.id,
                _team: { title: 'wizards', subdomain: 'wizards' },
                firstName: 'Mary',
                lastName: 'Totter',
                password: 'Dogwarts123',
                verifyPassword: 'Dogwarts123',
            };

            const response = await appRequest.post('/api/user').send(reqBody);

            expect(response.statusCode).toBe(200);
            delete response.body.hash;
            delete response.body.salt;
            delete response.body.inviteToken;
            delete response.body.defaultLoginTeam;
            delete response.body._team;
            expect(response).toMatchSnapshot();
        });

        it('should get a user', async () => {
            const userData = { email: 'user+200@schemadesign.com', provider: 'local' };
            const newUser = await insert(User, userData);
            const response = await appRequest.get(`/api/user/${getId(newUser)}`);
            expect(response.statusCode).toBe(200);
            expect(response).toMatchSnapshot();
        });

        it('should update a user (invited to a team)', async () => {
            const userData = { email: 'user+newuser@schemadesign.com', provider: 'local' };
            const newUser = await insert(User, userData);
            const reqBody = {
                ...newUser._doc,
                _team: team2,
                firstName: 'Oryx',
                lastName: 'Crake',
                password: 'Password123',
                verifyPassword: 'Password123',
            };
            const response = await appRequest.put(`/api/user/${getId(newUser)}`).send(reqBody);
            delete response.body.hash;
            delete response.body.salt;
            expect(response.statusCode).toBe(200);
            delete response.body.hash;
            delete response.body.salt;
            expect(response).toMatchSnapshot();
        });
    });
});
