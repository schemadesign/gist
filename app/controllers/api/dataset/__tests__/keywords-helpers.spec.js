import { hydrateDb, loginAndGetSessionCookie } from '../../../../../internals/testing/backend/utils';
import { processKeywords } from '../keywords-helpers';
import request from 'supertest';
import app from '../../../../../app';
import { user1 } from '../../../../../internals/testing/backend/fixtures/users';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';


describe('Keywords helpers', () => {
    let appRequest;
    const dataSource = {
        raw_rowObjects_coercionScheme: {
            percent: {
                operation: 'ToPercent',
            },
            integer: {
                operation: 'ToInteger',
            },
            float: {
                operation: 'ToFloat',
            },
            string: {
                operation: 'ToString',
            },
            date: {
                operation: 'ToDate',
                outputFormat: 'Y',
            },
            currency: {
                operation: 'ToCurrency',
                currency: '$',
            },
        },
    };

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    it('should return keywords', async () => {
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
        const response = await appRequest
            .get(`/api/dataset/keywords/${pokemon1._id}/Type 1`)
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);

        expect(response).toMatchSnapshot();
    });

    describe('processKeywords', () => {
        it('should return string keywords', async () => {
            const docs = [{ field: 'Some words' }, { field: 'word 1' }, { field: 'word 1' }, { field: 'w' }];
            const field = 'string';

            expect(processKeywords(docs, field, dataSource)).toMatchSnapshot();
        });

        it('should return dates keywords', async () => {
            const docs = [{ field: '2019-03-13T11:20:36.910Z' }, { field: '2019-03-13T11:20:36.910Z' }, { field: '-000566-11-26T01:46:40.001Z' }];
            const field = 'date';

            expect(processKeywords(docs, field, dataSource)).toMatchSnapshot();
        });

        it('should return percent keywords', async () => {
            const docs = [{ field: 0.2 }, { field: 0.2 }, { field: 0.1 }, { field: 0.5 }];
            const field = 'percent';

            expect(processKeywords(docs, field, dataSource)).toMatchSnapshot();
        });

        it('should return float keywords', async () => {
            const docs = [{ field: 0.2 }, { field: 0.2 }, { field: 0.1 }, { field: 0.5 }];
            const field = 'float';

            expect(processKeywords(docs, field, dataSource)).toMatchSnapshot();
        });

        it('should return  integer keywords', async () => {
            const docs = [{ field: 1 }, { field: 1 }, { field: 1 }, { field: 2 }];
            const field = 'integer';

            expect(processKeywords(docs, field, dataSource)).toMatchSnapshot();
        });

        it('should return currency keywords', async () => {
            const docs = [{ field: 0.2 }, { field: 0.2 }, { field: 0.1 }, { field: 0.5 }];
            const field = 'currency';

            expect(processKeywords(docs, field, dataSource)).toMatchSnapshot();
        });
    });
});
