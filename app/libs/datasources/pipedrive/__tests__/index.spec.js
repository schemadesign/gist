import { hydrateDb } from '../../../../../internals/testing/backend/utils';
import { user1, user2 } from '../../../../../internals/testing/backend/fixtures/users';
import { toString } from 'lodash';
import OAuth2 from '../../../oauth2';
import PipedriveDataHelpers from '../pipedrive-data-helpers';
import Pipedrive from '../index';

jest.mock('../../../oauth2');
jest.mock('../pipedrive-data-helpers');

describe('Pipedrive', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    it('should call redirect to the expected Pipedrive URL', () => {
        const req = {
            user: toString(user1._id)
        };
        const res = {
            redirect: jest.fn()
        };
        Pipedrive.requestPermissionLink(req, res);

        expect(res.redirect).toHaveBeenCalledWith(`https://oauth.pipedrive.com/oauth/authorize?client_id=${process.env.PIPEDRIVE_CLIENT_ID}&redirect_uri=http://app.local.arrays.co/auth/pipedrive&state=${toString(user1._id)}`);
    });

    it('should return 400 status code if Pipedrive returns with an error', () => {
        const pipedriveErrorString = 'user_error';
        const req = {
            query: {
                error: pipedriveErrorString
            }
        };
        const res = {
            render: jest.fn()
        };
        Pipedrive.pipedriveCallback(req, res);

        expect(res.render).toHaveBeenCalledWith('error', expect.any(Object));
    });

    it('should call oauthPostToken and render close on successful token post request', () => {
        const req = {
            query: {
                code: 'sEcRit_cODE'
            }
        };
        const res = {
            render: jest.fn()
        };

        OAuth2.oauthPostToken.mockImplementation(() => new Promise(resolve => {
            resolve();
            expect(res.render).toHaveBeenCalledWith('close');
        }));

        Pipedrive.pipedriveCallback(req, res);
    });

    it('should call #getAlLData with User\'s pipedrive token', () => {
        const endpointToCall = 'deals';
        PipedriveDataHelpers.getAllData.mockImplementation((token, endpoint) => {
            expect(token).toBe(`Bearer ${user2.pipedriveToken.access_token}`);
            expect(endpoint).toBe(endpointToCall);
        });

        Pipedrive.getDeals(toString(user2._id), endpointToCall);
    });
});
