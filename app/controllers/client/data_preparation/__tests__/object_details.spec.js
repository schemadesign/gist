import '../../../../../app';
import request from 'supertest';
import qs from 'querystring';

import app from '../../../../../app';
import { hydrateDb, loginAndGetSessionCookie } from '../../../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';
import { pokemon1RowObject1 } from '../../../../../internals/testing/backend/fixtures/pokemon1ProcessedRowObjects';
import { user1 } from '../../../../../internals/testing/backend/fixtures/users';

describe('Object details', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    it('should return 404', async () => {
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
        const response = await appRequest
            .get(`/json-api/v1/datasources/${pokemon1.uid}/views/object-details/graph-data`)
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);

        expect(response).toMatchSnapshot();
    });

    it('should return graph data', async () => {
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
        const params = {
            viewType: 'gallery',
            objectId: `${pokemon1RowObject1._id}`,
            objectIndex: 1,
            subdomain: 'glitter',
        };
        const response = await appRequest
            .get(`/json-api/v1/datasources/${pokemon1.uid}/views/object-details/graph-data?${qs.stringify(params)}`)
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);

        expect(response).toMatchSnapshot();
    });
});
