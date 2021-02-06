import { values } from 'lodash';
import async from 'async';

import { connection } from '../../../app/models/mongoose_client';
import Description from '../../../app/models/descriptions';
import Team from '../../../app/models/teams';
import User from '../../../app/models/users';
import Website from '../../../app/models/websites';
import Page from '../../../app/models/pages';
import View from '../../../app/models/views';
import cached_values from '../../../app/models/cached_values';
import { Lazy_Shared_ProcessedRowObject_MongooseContext } from '../../../app/models/processed_row_objects';
import { Model as RawSourceDocuments } from '../../../app/models/raw_source_documents';
import SharedPage from '../../../app/models/shared_pages';
import Story from '../../../app/models/stories';
import ApiKey from '../../../app/models/api_keys';
import Token from '../../../app/models/tokens';

import * as usersFixtures from './fixtures/users';
import * as teamsFixtures from './fixtures/teams';
import * as datasetsFixtures from './fixtures/datasets';
import * as pagesFixtures from './fixtures/pages';
import * as websitesFixtures from './fixtures/sites';
import * as pokemon1ProcessedRowObjectsFixtures from './fixtures/pokemon1ProcessedRowObjects';
import * as publicDatasetProcessedRowObjectsFixtures from './fixtures/publicDatasetProcessedRowObjects';
import * as privateVizWithEditorProcessedRowObjectsFixtures from './fixtures/privateVizWithEditorProcessedRowObjects';
import * as allDataTypesJsonProcessedRowObjectsFixtures from './fixtures/allDataTypesJsonProcessedRowObjects';
import * as apiDatasetProcessedRowObjectsFixtures from './fixtures/apiDatasetProcessedRowObjects';
import * as rawSourceDocumentsData from './fixtures/rawSourceDocuments';
import * as cachedValuesFixtures from './fixtures/cachedValues';
import * as storiesFixtures from './fixtures/stories';
import * as sharedPagesFixtures from './fixtures/sharedPages';
import * as apiKeysFixtures from './fixtures/apiKeys';
import * as tokensFixtures from './fixtures/tokens';
import viewsFixtures from './fixtures/views';


export const getId = (object) => object._id.toString();

export const insert = (model, object) => new Promise((resolve, reject) =>
    model.create(object, (err, data) => err ? reject(err) : resolve(data)),
);

const insertMany = (model, objects) => new Promise((resolve, reject) => {
    model.insertMany(objects, (err, data) => err ? reject(err) : resolve(data));
});

export const clearDb = () => new Promise((resolve, reject) => {
    async.waterfall([
        (callback) => connection.db.listCollections().toArray(callback),
        (collections, callback) => async.map(
            collections,
            (collection, callback) => {
                connection.db.collection(collection.name).removeMany({}, callback);
            },
            callback,
        ),
    ], (err) => err ? reject(err) : resolve());
});

export const hydrateDb = async () => {
    await clearDb();

    const { Model: Pokemon1ProcessedRowObjects } =
        Lazy_Shared_ProcessedRowObject_MongooseContext(getId(datasetsFixtures.pokemon1));
    const { Model: PrivateVizWithEditorProcessedRowObjects } =
        Lazy_Shared_ProcessedRowObject_MongooseContext(getId(datasetsFixtures.privateVizWithEditor));
    const { Model: AllDataTypesJsonProcessedRowObjects } =
        Lazy_Shared_ProcessedRowObject_MongooseContext(getId(datasetsFixtures.allDataTypesJson));
    const { Model: PublicDatasetProcessedRowObjects } =
        Lazy_Shared_ProcessedRowObject_MongooseContext(getId(datasetsFixtures.publicDataset));
    const { Model: APIProcessedRowObjects } =
        Lazy_Shared_ProcessedRowObject_MongooseContext(getId(datasetsFixtures.apiDataset));

    await Promise.all([
        insertMany(User, values(usersFixtures)),
        insertMany(Team, values(teamsFixtures)),
        insertMany(Description, values(datasetsFixtures)),
        insertMany(View, values(viewsFixtures)),
        insertMany(Website, values(websitesFixtures)),
        insertMany(Page, values(pagesFixtures)),
        insertMany(Pokemon1ProcessedRowObjects, values(pokemon1ProcessedRowObjectsFixtures)),
        insertMany(PrivateVizWithEditorProcessedRowObjects, values(privateVizWithEditorProcessedRowObjectsFixtures)),
        insertMany(AllDataTypesJsonProcessedRowObjects, values(allDataTypesJsonProcessedRowObjectsFixtures)),
        insertMany(PublicDatasetProcessedRowObjects, values(publicDatasetProcessedRowObjectsFixtures)),
        insertMany(RawSourceDocuments, values(rawSourceDocumentsData)),
        insertMany(cached_values, values(cachedValuesFixtures)),
        insertMany(Story, values(storiesFixtures)),
        insertMany(SharedPage, values(sharedPagesFixtures)),
        insertMany(APIProcessedRowObjects, values(apiDatasetProcessedRowObjectsFixtures)),
        insertMany(ApiKey, values(apiKeysFixtures)),
        insertMany(Token, values(tokensFixtures)),
    ]);
};

export const loginAndGetSessionCookie = async (appRequest, { email }) => {
    const res = await appRequest
        .post('/auth/login')
        .send({
            email,
            password: 'test',
        });

    return res.headers['set-cookie'];
};
