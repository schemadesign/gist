import request from 'supertest';

import app from '../../../app';
import { hydrateDb, getId } from '../../../internals/testing/backend/utils';
import { user2, editorUser, user1 } from '../../../internals/testing/backend/fixtures/users';
import {
    pokemon1,
    privateVizWithEditor,
} from '../../../internals/testing/backend/fixtures/datasets';


const user1Id = getId(user1);
const user2Id = getId(user2);
const editorUserId = getId(editorUser);
const pokemon1Id = getId(pokemon1);

describe('Permissions API', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    it('should set all dataset permissions and return them', async () => {
        const requestData = {
            id: pokemon1Id,
            vizType: 'standardViz',
        };
        const response = await appRequest
            .post('/api/permissions/dataset')
            .send(requestData);

        expect(response).toMatchSnapshot();
    });

    it('should get all dataset permissions', async () => {
        const response = await appRequest
            .get(`/api/permissions/dataset/${getId(privateVizWithEditor)}`)
            .send();

        expect(response).toMatchSnapshot();
    });

    it('should get all user permissions for superAdmin', async () => {
        const response = await appRequest
            .get(`/api/permissions/user/${user1Id}/superAdmin`)
            .send();
        expect(response.statusCode).toBe(200);
        expect(response).toMatchSnapshot();
    });

    it('should get all user permissions for admin user', async () => {
        const response = await appRequest
            .get(`/api/permissions/user/${user2Id}/admin`)
            .send();

        expect(response).toMatchSnapshot();
    });

    it('should get all user permissions for viz editor user', async () => {
        const response = await appRequest
            .get(`/api/permissions/user/${editorUserId}/superAdmin`)
            .send();

        expect(response).toMatchSnapshot();
    });
});
