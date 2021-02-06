import request from 'supertest';

import { hydrateDb, loginAndGetSessionCookie } from '../../../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';
import { user1 } from '../../../../../internals/testing/backend/fixtures/users';
import app from '../../../../../app';

const { Lazy_Shared_ProcessedRowObject_MongooseContext } = require('../../../../models/processed_row_objects');

const getProcessedRowObjectsModel = (datasetId) => Lazy_Shared_ProcessedRowObject_MongooseContext(datasetId).Model;

describe('Created field', () => {
    let appRequest, createResponse, sessionCookie;
    const ProcessedRowObjects = getProcessedRowObjectsModel(pokemon1._id);
    const newField = 'new-field';

    beforeEach(async () => {
        await hydrateDb();

        appRequest = request(app);
        sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
        createResponse = await appRequest
            .post(`/api/dataset/content/${pokemon1._id}/createField/${newField}`)
            .send({ dataType: 'Text' })
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);
    });

    it('should create a new field', async () => {
        const data = await ProcessedRowObjects.find({ [`rowParams.${newField}`]: { $exists: true } }, { rowParams: 1 });

        expect(data).toMatchSnapshot();
        expect(createResponse).toMatchSnapshot();
    });

    it('should remove a field', async () => {
        const removeResponse = await appRequest
            .post(`/api/dataset/content/${pokemon1._id}/removeField/new-field`)
            .send({ dataType: 'Text' })
            .set('Cookie', sessionCookie)
            .set('Host', `glitter.${process.env.HOST}`);
        const data = await ProcessedRowObjects.find({ [`rowParams.${newField}`]: { $exists: true } });

        expect(data).toMatchSnapshot();
        expect(removeResponse).toMatchSnapshot();
    });
});
