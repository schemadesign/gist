import { toString } from 'lodash';
import request from 'request';

import { hydrateDb } from '../../../../../internals/testing/backend/utils';
import { user1, user2 } from '../../../../../internals/testing/backend/fixtures/users';
import Salesforce from '../index';
import User from '../../../../models/users';

jest.mock('request');

describe('Salesforce', () => {
    const sendFn = jest.fn();
    const res = {
        send: jest.fn(),
        redirect: jest.fn(),
        render: jest.fn(),
        json: jest.fn(),
        status: jest.fn(() => {
            return {
                send: jest.fn(),
                json: sendFn,
            };
        }),
    };

    beforeEach(async () => {
        await hydrateDb();
    });

    it('should call redirect to the expected Salesforce URL', () => {
        const req = {
            user: toString(user1._id),
        };

        Salesforce.requestPermissionLink(req, res);

        expect(res.redirect).toHaveBeenCalledWith(`https://login.salesforce.com/services/oauth2/authorize?client_id=${process.env.SALESFORCE_CONSUMER_KEY}&redirect_uri=https://app.local.arrays.co/auth/salesforce&response_type=code&state=${toString(user1._id)}`);
    });

    it('should return 400 status if Salesforce returns an error', async () => {
        const salesforceErrorString = 'Error 1006';
        const req = {
            query: {
                error: salesforceErrorString,
            },
        };

        Salesforce.salesforceCallback(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(sendFn).toHaveBeenCalledWith({ error: `Non-public error: The Salesforce API returned with an error: ${salesforceErrorString}` });
    });

    it('should send the temporary token to the Salesforce API and save the response to the User document', async () => {
        const salesforceTempCode = 'uNiQuE_COde';
        const salesforceToken = { access_token: 'veRy_unIQue_COdE' };
        const req = {
            query: {
                code: salesforceTempCode,
                state: toString(user1._id),
            },
        };

        request.post.mockImplementation((link, form, callback) => {
            callback(null, null, JSON.stringify(salesforceToken));
        });
        Salesforce.salesforceCallback(req, res);

        const user = await User.findById(toString(user1._id));

        expect(user.salesforceToken).toMatchObject(salesforceToken);
        expect(res.render).toHaveBeenCalledWith('close');
    });

    describe('when validateToken', () => {
        it('should pass checking', async () => {
            const data = '{"data": "data"}';
            const req = {
                user: toString(user2._id),
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback(null, null, data);
            });

            await Salesforce.validateToken(req, res);

            expect(res.json).toHaveBeenCalledWith({ isValidToken: true });
        });

        it('should fail checking if error happen on request', async () => {
            const data = '{"data": "data"}';
            const req = {
                user: toString(user2._id),
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback('error', null, data);
            });

            await Salesforce.validateToken(req, res);

            expect(res.json).toHaveBeenCalledWith({ isValidToken: false });
        });

        it('should send isValidToken false if salesforceToken not exist in user', async () => {
            const req = {
                user: toString(user1._id),
            };

            await Salesforce.validateToken(req, res);

            expect(res.json).toHaveBeenCalledWith({ isValidToken: false });
        });
    });

    describe('when getTables', () => {
        it('should return tables', async () => {
            const data = JSON.stringify({ sobjects: [{ name: 'table 1' }] });
            const req = {
                user: toString(user2._id),
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback(null, null, data);
            });

            await Salesforce.getTables(req, res);

            expect(res.json).toHaveBeenCalledWith({ tables: ['table 1'] });
        });

        it('should return error', async () => {
            const data = JSON.stringify({});
            const req = {
                user: toString(user2._id),
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback('error', null, data);
            });

            await Salesforce.getTables(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(sendFn).toHaveBeenCalledWith({ error: 'Non-public error: Salesforce error while getting tables from api' });
        });

        it('should return error when such user doesn\'t exist', async () => {
            const req = {
                user: toString(user1._id),
            };

            const error = 'Salesforce error while getting tables';

            await Salesforce.getTables(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(sendFn).toHaveBeenCalledWith({ error: `Non-public error: ${error}` });
        });
    });

    describe('when getFields', () => {
        it('should return fields', async () => {
            const data = JSON.stringify({ fields: [{ name: 'field 1' }] });
            const req = {
                user: toString(user2._id),
                query: {
                    table: 'Table 1',
                },
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback(null, null, data);
            });

            await Salesforce.getFields(req, res);

            expect(res.json).toHaveBeenCalledWith({ fields: ['field 1'] });
        });

        it('should return empty array if fields not exist', async () => {
            const data = JSON.stringify({});
            const req = {
                user: toString(user2._id),
                query: {
                    table: 'Table 1',
                },
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback('error', null, data);
            });

            await Salesforce.getFields(req, res);

            expect(res.json).toHaveBeenCalledWith({ fields: [] });
        });

        it('should return error when such user doesn\'t exist', async () => {
            const req = {
                user: toString(user1._id),
            };

            const error = 'Salesforce error while getting fields';

            await Salesforce.getFields(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(sendFn).toHaveBeenCalledWith({ error: `Non-public error: ${error}` });
        });
    });

    describe('when validateQuery', () => {
        it('should check query and return result', async () => {
            const data = JSON.stringify({});
            const req = {
                user: toString(user2._id),
                query: {
                    fields: ['field 1'],
                    table: 'table',
                },
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback(null, null, data);
            });

            await Salesforce.validateQuery(req, res);

            expect(res.json).toHaveBeenCalledWith({});
        });

        it('should return error', async () => {
            const data = JSON.stringify({});
            const error = 'error';
            const req = {
                user: toString(user2._id),
                query: {
                    fields: ['field 1'],
                    table: 'table',
                },
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback('error', null, data);
            });

            await Salesforce.validateQuery(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(sendFn).toHaveBeenCalledWith({ error: `Non-public error: ${error}` });
        });

        it('should return error when missing query params', async () => {
            const req = {
                user: toString(user1._id),
            };

            const error = 'Missing query params';

            await Salesforce.validateQuery(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(sendFn).toHaveBeenCalledWith({ error: `Non-public error: ${error}` });
        });
    });

    describe('when queryDataset', () => {
        it('should return data', async () => {
            const response = JSON.stringify({ records: [{}] });

            const user = toString(user2._id);
            const query = {
                fields: ['field 1'],
                table: 'table',
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback(null, null, response);
            });

            const data = await Salesforce.queryDataset(user, query);
            expect(data).toEqual(expect.any(Object));
        });

        it('should return error when request fails', async () => {
            const response = JSON.stringify({ records: [{}] });

            const user = toString(user2._id);
            const query = {
                fields: ['field 1'],
                table: 'table',
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback('error', null, response);
            });

            try {
                await Salesforce.queryDataset(user, query);
            } catch (e) {
                expect(e).toEqual('error');
            }
        });

        it('should return error when user doesn\'t exist or does\'nt have salesforce', async () => {
            const response = JSON.stringify({ records: [{}] });

            const user = toString(user1._id);
            const query = {
                fields: ['field 1'],
                table: 'table',
            };

            request.get.mockImplementation((link, headers, callback) => {
                callback('error', null, response);
            });

            try {
                await Salesforce.queryDataset(user, query);
            } catch (e) {
                expect(e).toEqual(expect.any(Error));
            }
        });
    });
});
