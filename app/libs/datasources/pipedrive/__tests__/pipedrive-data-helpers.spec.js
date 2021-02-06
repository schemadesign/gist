import request from 'request';
import PipedriveDataHelpers from '../pipedrive-data-helpers';
import { PublicError } from '../../../system/errors';
import { Readable } from 'stream';

jest.mock('request');

describe('Pipedrive', () => {
    const secretToken = 'secrit';

    it('should request data and make sure it is returned as a Stream', async () => {
        const mockPipedriveData = {
            data: [
                {
                    id: '1',
                    user: {}
                },
                {
                    id: '2',
                    user: {}
                }
            ]
        };
        request.get.mockImplementation((url, headers, callback) => {
            // Check to see the token was passed correctly
            expect(headers.headers.Authorization).toBe(secretToken);
            callback(null, null, JSON.stringify(mockPipedriveData));
        });

        const stream = await PipedriveDataHelpers.getAllData(secretToken, 'deals');
        expect(stream).toBeInstanceOf(Readable);
    });

    it('should throw a public error if no data', async () => {
        const mockPipedriveData = {
            data: null
        };
        request.get.mockImplementation((url, headers, callback) => {
            callback(null, null, JSON.stringify(mockPipedriveData));
        });
        try {
            await PipedriveDataHelpers.getAllData(secretToken, 'deals');
        } catch (e) {
            expect(e).toEqual(new PublicError('No Pipedrive data, please select a connection that has data.'));
        }
    });
});
