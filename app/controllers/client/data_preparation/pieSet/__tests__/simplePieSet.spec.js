import request from 'supertest';

import app from '../../../../../../app';
import Description from '../../../../../../app/models/descriptions';
import { hydrateDb, loginAndGetSessionCookie } from '../../../../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../../../../internals/testing/backend/fixtures/datasets';
import { user1 } from '../../../../../../internals/testing/backend/fixtures/users';

describe('Simple pie set', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        await Description.update({ _id: pokemon1._id }, {
            $set: {
                'fe_views.views.pieSet.simpleChart': true,
                'fe_views.views.pieSet.pies': ['Max HP', 'Max CP']
            }
        });
        appRequest = request(app);
    });

    it('should return graph data', async () => {
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
        const response = await appRequest
            .get(`/json-api/v1/datasources/${pokemon1.uid}/views/pie-set/graph-data`)
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);

        expect(response).toMatchSnapshot();
    });

    it('should return filtered graph data ', async () => {
        const sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
        const response = await appRequest
            .get(`/json-api/v1/datasources/${pokemon1.uid}/views/pie-set/graph-data?Type 1=Fire`)
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);

        expect(response).toMatchSnapshot();
    });
});
