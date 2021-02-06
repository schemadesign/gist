import { hydrateDb } from '../../../../../internals/testing/backend/utils';
import { user1, user2 } from '../../../../../internals/testing/backend/fixtures/users';
import { toString } from 'lodash';
import request from 'request';
import User from '../../../../models/users';
import Smartsheet from '../index';

jest.mock('request');

describe('Smartsheet', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    it('should call redirect to the expected Smartsheet URL', () => {
        const req = {
            user: toString(user1._id)
        };
        const res = {
            redirect: jest.fn()
        };
        Smartsheet.requestPermissionLink(req, res);

        expect(res.redirect).toHaveBeenCalledWith(`https://app.smartsheet.com/b/authorize?response_type=code&client_id=${process.env.SMARTSHEET_CLIENT_ID}&scope=READ_SHEETS&state=${toString(user1._id)}`);
    });

    it('should return 400 status if Smartsheet returns an error', () => {
        const smartsheetErrorString = 'Error 1006';
        const sendFn = jest.fn();
        const req = {
            query: {
                error: smartsheetErrorString
            }
        };
        const res = {
            status: jest.fn(() => {
                return {
                    send: sendFn
                };
            })
        };
        Smartsheet.smartsheetCallback(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(sendFn).toHaveBeenCalledWith(smartsheetErrorString);
    });

    it('should send the temporary token to the Smartsheet API and save the response to the User document', async () => {
        const smartsheetTempCode = 'uNiQuE_COde';
        const smartsheetToken = {
            access_token: 'veRy_unIQue_COdE',
            expires_in: 1
        };
        const req = {
            query: {
                code: smartsheetTempCode,
                state: toString(user1._id)
            }
        };
        const res = {
            render: jest.fn()
        };
        request.post.mockImplementation((link, form, callback) => {
            callback(null, null, JSON.stringify(smartsheetToken));
        });
        Smartsheet.smartsheetCallback(req, res);

        const user = await User.findById(toString(user1._id));
        expect(user.smartsheetToken).toMatchObject(smartsheetToken);
        expect(res.render).toHaveBeenCalledWith('close');
    });

    it('should send a request to the Smartsheet API to get sheet data', () => {
        const sheets = [];
        const req = {
            user: toString(user2._id)
        };
        const res = {
            send: jest.fn()
        };
        request.get.mockImplementation((link, headers, callback) => {
            callback(null, null, sheets);
            expect(res.send).toHaveBeenCalledWith(sheets);
        });
        Smartsheet.getSheets(req, res);
    });

    it('should send a request to the Smartsheet API to get an individual sheet CSV', async () => {
        const sheetId = '3338282585';
        request.get.mockImplementation((link, headers) => {
            expect(link).toBe(`https://api.smartsheet.com/2.0/sheets/${sheetId}`);
            expect(headers).toMatchObject({
                headers: {
                    Authorization: `Bearer ${user2.smartsheetToken.access_token}`,
                    Accept: 'text/csv'
                },
            });
        });
        Smartsheet.getSheet(toString(user2._id), sheetId);
    });
});
