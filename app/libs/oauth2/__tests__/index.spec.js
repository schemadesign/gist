import { hydrateDb } from '../../../../internals/testing/backend/utils';
import { user1 } from '../../../../internals/testing/backend/fixtures/users';
import { toString } from 'lodash';
import request from 'request';
import User from '../../../models/users';
import OAuth2 from '../index';

jest.mock('request');

describe('OAuth2', () => {

    const testUrl = 'https://testpost.oauth2/token';
    const tokenSource = 'smartsheetToken';

    beforeEach(async () => {
        await hydrateDb();
    });

    it('should take the given URL, save the token it recieves, and assign correct expires_at', async () => {
        const exampleToken = {
            access_token: 'veRy_unIQue_COdE',
            expires_in: 10000
        };
        request.post.mockImplementation((url, params, callback) => {
            callback(null, null, JSON.stringify(exampleToken));
        });
        OAuth2.oauthPostToken(testUrl, {}, {}, toString(user1._id), tokenSource);

        const user = await User.findById(toString(user1._id));
        expect(user[tokenSource]).toMatchObject(exampleToken);
        expect(user[tokenSource].expires_at).toBeGreaterThan(Date.now());
    });

    it('should reject the promise with an error on a bad request', async () => {
        const passedError = new Error('ya dun goofed');
        request.post.mockImplementation((url, params, callback) => {
            callback(passedError, null, null);
        });

        OAuth2.oauthPostToken(testUrl, {}, {}, toString(user1._id), tokenSource)
            .catch(error => {
                expect(error).toBe(passedError);
            });
    });
});
