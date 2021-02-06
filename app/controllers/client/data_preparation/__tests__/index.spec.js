import '../../../../../app';
import { BindData } from '../index';

import { hydrateDb, getId } from '../../../../../internals/testing/backend/utils';
import { hackyUser } from '../../../../../internals/testing/backend/fixtures/users';
import { pokemon1, simpsons } from '../../../../../internals/testing/backend/fixtures/datasets';


const promisified_BindData = (req, callback) => new Promise(resolve => {
    BindData(req, (...args) => {
        callback(...args);
        resolve();
    });
});

describe('Data Preparation: Index', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('BindData', () => {
        afterEach(() => {
            delete process.env.SUBTEAMS;
        });

        it('should prepare showcase data', async () => {
            const callback = jest.fn();
            const requestData = {
                user: getId(hackyUser),
                query: {},
                path: '/',
            };

            await promisified_BindData(requestData, callback);

            expect(callback).toHaveBeenCalledWith(null, expect.any(Object));
            expect(callback.mock.calls[0][1]).toMatchSnapshot();
        });

        it('should prepare showcase data properly when process.env.SUBTEAMS is set', async () => {
            const callback = jest.fn();
            const requestData = {
                user: null,
                query: {},
                path: '/articles',
            };

            process.env.SUBTEAMS = true;

            await promisified_BindData(requestData, callback);

            expect(callback).toHaveBeenCalledWith(null, expect.any(Object));
            expect(callback.mock.calls[0][1]).toMatchSnapshot();
        });

        it('should prepare showcase data properly when filters enabled', async () => {
            const callback = jest.fn();
            const requestData = {
                user: null,
                query: {
                    vizName: ['Simpsons'],
                },
                path: '/insights',
            };

            process.env.SUBTEAMS = true;

            await promisified_BindData(requestData, callback);

            expect(callback).toHaveBeenCalledWith(null, expect.any(Object));
            expect(callback.mock.calls[0][1]).toMatchSnapshot();
        });
    });
});
