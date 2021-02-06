import '../../../../../app';
import request from 'supertest';

import app from '../../../../../app';
import { hydrateDb, loginAndGetSessionCookie } from '../../../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';
import { user1 } from '../../../../../internals/testing/backend/fixtures/users';

describe('Treemap', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    it('should return graph data', async () => {
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
        const response = await appRequest
            .get(`/json-api/v1/datasources/${pokemon1.uid}/views/treemap/graph-data`)
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);

        expect(response).toMatchSnapshot();
    });

    it('should return graph data group by is equal to chart by', async () => {
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
        const response = await appRequest
            .get(`/json-api/v1/datasources/${pokemon1.uid}/views/treemap/graph-data?groupBy=Name`)
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);

        expect(response).toMatchSnapshot();
    });

    it('should return graph data aggregate by number of items', async () => {
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
        const response = await appRequest
            .get(`/json-api/v1/datasources/${pokemon1.uid}/views/treemap/graph-data?aggregateBy=Number%20of%20Items`)
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);

        expect(response).toMatchSnapshot();
    });
});
