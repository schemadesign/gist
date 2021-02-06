import { hydrateDb } from '../../../../../internals/testing/backend/utils';
import { user1, user2 } from '../../../../../internals/testing/backend/fixtures/users';
import { toString, toLower } from 'lodash';
import request from 'request';
import OAuth2 from '../../../oauth2';
import Datadotworld from '../index';

jest.mock('../../../oauth2');
jest.mock('request');

describe('Data.world', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    it('should redirect to the expected Data.world URL', () => {
        const req = {
            user: toString(user1._id)
        };

        const res = {
            redirect: jest.fn()
        };

        Datadotworld.requestPermissionLink(req, res);
        expect(res.redirect).toHaveBeenCalledWith(`https://data.world/oauth/authorize?client_id=${process.env.DATA_DOT_WORLD_CLIENT_ID}&redirect_uri=http://app.local.arrays.co/auth/datadotworld&state=${toString(user1._id)}`);
    });

    it('should return render error page if Data.world passes an error', () => {
        const datadotworldErrorString = 'Error 1006';
        const req = {
            query: {
                error: datadotworldErrorString
            }
        };
        const res = {
            render: jest.fn()
        };
        Datadotworld.datadotworldCallback(req, res);

        expect(res.render).toHaveBeenCalledWith('error', expect.any(Object));
    });

    it('should call oauthPostToken and render close on successful post request', () => {
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

        Datadotworld.datadotworldCallback(req, res);
    });

    it('should get the passed user\'s bearer string on getting datasets, queries and tables', () => {
        const req = {
            query: {
                owner: 'owner',
                id: 'id',
            },
            user: toString(user2._id)
        };
        const res = {
            json: jest.fn()
        };
        request.get.mockImplementation((url, headers, callback) => {
            expect(headers.headers.Authorization).toBe(`Bearer ${user2.datadotworldToken.access_token}`);
            callback(null, null, '{}');
        });
        request.post.mockImplementation((url, headers, callback) => {
            expect(headers.headers.Authorization).toBe(`Bearer ${user2.datadotworldToken.access_token}`);
            callback(null, null, '{}');
        });

        Datadotworld.getDatasets(req, res);
        Datadotworld.getQueries(req, res);
        Datadotworld.getTables(req, res);
    });

    it('should request a query or table depending on the passed datadotworld', async () => {
        const userId = toString(user2._id);
        const datadotworldTable = {
            owner: 'owner',
            id: 'id',
            table: 'TABLE'
        };
        const datadotworldQuery = {
            owner: 'owner',
            id: 'id',
            query: 'SELECT * FROM TABLE',
            language: 'SQL'
        };

        request.post.mockImplementation((url, headers) => {
            return { url, headers };
        });
        const tableResult = await Datadotworld.queryDataset(userId, datadotworldTable);
        const queryResult = await Datadotworld.queryDataset(userId, datadotworldQuery);

        expect(tableResult.headers.form).toMatchObject({ query: `SELECT * FROM ${datadotworldTable.table}` });
        expect(queryResult.headers.form).toMatchObject({ query: datadotworldQuery.query });
        expect(tableResult.headers.headers.Authorization).toBe(`Bearer ${user2.datadotworldToken.access_token}`);
        expect(queryResult.headers.headers.Authorization).toBe(`Bearer ${user2.datadotworldToken.access_token}`);
        expect(tableResult.url).toBe(`https://api.data.world/v0/sql/${datadotworldTable.owner}/${datadotworldTable.id}`);
        expect(queryResult.url).toBe(`https://api.data.world/v0/${toLower(datadotworldQuery.language)}/${datadotworldQuery.owner}/${datadotworldQuery.id}`);
    });
});
