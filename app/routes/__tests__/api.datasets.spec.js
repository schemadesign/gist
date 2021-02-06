import { merge } from 'lodash';
import request from 'supertest';

import app from '../../../app';
import Description from '../../models/descriptions';
import { hydrateDb, getId, loginAndGetSessionCookie } from '../../../internals/testing/backend/utils';
import { editorUser, user1, superUser } from '../../../internals/testing/backend/fixtures/users';
import { team1 } from '../../../internals/testing/backend/fixtures/teams';
import {
    pokemon1,
    freshViz,
    childDataset,
    exampleGs,
    publicDataset,
} from '../../../internals/testing/backend/fixtures/datasets';


const team1Id = getId(team1);
const user1Id = getId(user1);
const pokemon1Id = getId(pokemon1);
const exampleGsId = getId(exampleGs);
const freshVizId = getId(freshViz);
const childDatasetId = getId(childDataset);
const publicDatasetId = getId(publicDataset);

describe('Datasets API', () => {
    let appRequest, sessionCookie;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
        sessionCookie = await loginAndGetSessionCookie(appRequest, user1);
    });

    describe('Get', () => {
        it('should return 404 when passing fake id', async () => {
            const response = await appRequest.get('/api/dataset/5a42c26e303770208de8f83b');

            expect(response.statusCode).toBe(404);
        });

        it('should return 500 when passing non mongo id', async () => {
            const response = await appRequest.get('/api/dataset/get/test');

            expect(response.statusCode).toBe(500);
        });

        it('should return pokemon 1 dataset', async () => {
            const response = await appRequest.get(`/api/dataset/get/${pokemon1Id}`);

            expect(response).toMatchSnapshot();
        });
    });

    describe('Approval request', () => {
        it('should change state to approved as super admin', async () => {
            sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const response = await appRequest
                .put(`/api/dataset/approve/${freshVizId}`)
                .set('Cookie', sessionCookie)
                .send({ state: 'approved' });

            expect(await Description.findById(freshVizId)).toHaveProperty('state', 'approved');
            expect(response).toMatchSnapshot();
        });

        it('should change state to disapproved as super admin', async () => {
            sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const response = await appRequest
                .put(`/api/dataset/approve/${pokemon1Id}`)
                .set('Cookie', sessionCookie)
                .send({ state: 'disapproved' });

            expect(await Description.findById(pokemon1Id)).toHaveProperty('state', 'disapproved');
            expect(response).toMatchSnapshot();
        });

        it('should change state to undefined as super admin', async () => {
            sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
            const response = await appRequest
                .put(`/api/dataset/approve/${pokemon1Id}`)
                .set('Cookie', sessionCookie)
                .send({ state: null });

            expect(await Description.findById(pokemon1Id)).toHaveProperty('state', undefined);
            expect(response).toMatchSnapshot();
        });

        it('should change state to undefined as team admin', async () => {
            const response = await appRequest
                .put(`/api/dataset/approve/${pokemon1Id}`)
                .set('Cookie', sessionCookie)
                .send({ state: null });

            expect(await Description.findById(pokemon1Id)).toHaveProperty('state', undefined);
            expect(response).toMatchSnapshot();
        });

        it('should not allow team admin to change state to approved', async () => {
            const response = await appRequest
                .put(`/api/dataset/approve/${freshVizId}`)
                .set('Cookie', sessionCookie)
                .send({ state: 'approved' });

            expect(await Description.findById(freshVizId)).toHaveProperty('state', undefined);
            expect(response).toMatchSnapshot();
        });

        it('should not allow team admin to change state to disapproved', async () => {
            const response = await appRequest
                .put(`/api/dataset/approve/${freshVizId}`)
                .set('Cookie', sessionCookie)
                .send({ state: 'disapproved' });

            expect(await Description.findById(freshVizId)).toHaveProperty('state', undefined);
            expect(response).toMatchSnapshot();
        });
    });

    describe('Get with query', () => {
        it('should return 404 when passing fake id', async () => {
            const response = await appRequest
                .post('/api/dataset/getDatasetsWithQuery')
                .send({});

            expect(response).toMatchSnapshot();
        });

        it('should get datasets associated with author "user1"', async () => {
            const response = await appRequest
                .post('/api/dataset/getDatasetsWithQuery')
                .send({ author: user1Id });

            expect(response).toMatchSnapshot();
        });

        it('should only get the dataset for which "editorUser" has editing privledges', async () => {
            const user = editorUser;
            const query = {
                $or: [
                    { _id: { $in: user._editors } },
                    { author: user._id },
                ],
                _team: user.defaultLoginTeam._id,
            };
            const response = await appRequest
                .post('/api/dataset/getDatasetsWithQuery')
                .send(query);

            expect(response).toMatchSnapshot();
        });
    });

    describe('Save', () => {
        it('should create a new dataset and return Id', async () => {
            const requestData = {
                urls: [],
                title: 'New Viz',
                author: user1Id,
                _team: team1Id,
                uid: 'newviz',
                updatedBy: user1Id,
            };
            const response = await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(200);
        });

        it('should return error if creating a new dataset with no team', async () => {
            const requestData = {
                urls: [],
                title: 'New Viz 2',
                author: '599b8216a2c04ca76341677d',
                _team: '599b821949b543a766e8ea44',
                uid: 'newviz2',
                updatedBy: '599b8216a2c04ca76341677d',
            };
            const response = await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(500);
        });

        it('should save a JSONPath and API endpoint', async () => {
            const requestData = {
                _id: freshVizId,
                apiEndPoint: 'http://api.tvmaze.com/singlesearch/shows?q=game-of-thrones&embed=episodes',
                JSONPath: '_embedded.episodes.*',
                format: 'JSON',
            };
            const response = await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response.status).toBe(200);
            expect(response.body.dataset).toMatchSnapshot({
                jobId: expect.any(Number),
                updatedAt: expect.any(String),
            });
            expect(response.body.dataset.jobId).toBeGreaterThan(0);
        });

        it('should save exclude fields', async () => {
            const requestData = {
                _id: pokemon1Id,
                fe_excludeFieldsObjDetail: {
                    'Pokemon No_': false,
                    'Name': false, // eslint-disable-line quote-props
                    'Type 1': false,
                    'Type 2': false,
                    'Max CP': false,
                    'Max HP': false,
                    'Image URL': true,
                },
            };
            const response = await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should save custom fields', async () => {
            const requestData = {
                _id: pokemon1Id,
                customFieldsToProcess: [{
                    fieldName: 'All Types',
                    fieldType: 'array',
                    fieldsToMergeIntoArray: ['Type 2', 'Type 1'],
                    delimiterOnFields: [],
                }],
            };
            const response = await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should save raw_rowObjects_coercionScheme', async () => {
            const requestData = {
                _id: pokemon1Id,
                raw_rowObjects_coercionScheme: {
                    'Image URL': { operation: 'ToString' },
                    'Max HP': { operation: 'ToString' },
                    'Max CP': { operation: 'ToString' },
                    'Type 2': { operation: 'ToString' },
                    'Type 1': { operation: 'ToString' },
                    'Name': { operation: 'ToString' }, // eslint-disable-line quote-props
                    'Pokemon No_': { operation: 'ToInteger' },
                },
            };
            const response = await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response.body.dataset).toMatchSnapshot({
                jobId: expect.any(Number),
                updatedAt: expect.any(String),
            });
            expect(response.body.dataset.jobId).toBeGreaterThan(0);
        });

        it(`should save fieldsNotAvailable, fieldsMultiselectable,
            oneToOneOverrideWithValuesByTitleByFieldName, fieldsSortableInReverseOrder`, async () => {
            const requestData = {
                _id: pokemon1Id,
                fe_filters: {
                    fieldsNotAvailable: ['Image URL'],
                    fieldsMultiSelectable: ['Name'],
                    fieldsSortableInReverseOrder: ['Name'],
                    oneToOneOverrideWithValuesByTitleByFieldName: {
                        'Type 1': [{
                            override: 'Agua',
                            value: 'Water',
                        }],
                    },
                },
            };
            const response = await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(200);
            expect(response.body.dataset).toMatchSnapshot({
                lastImportInitiatedBy: expect.any(String),
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
                jobId: expect.any(Number),
                _team: {
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                },
                author: {
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String),
                },
            });
        });

        it('should save child dataset', async () => {
            const requestData = {
                _id: childDatasetId,
            };
            const response = await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response).toMatchSnapshot();
        });

        it('should check mandatory settings', async () => {
            const requestData = {
                _id: publicDatasetId,
                fe_views: merge({}, publicDataset.fe_views, {
                    views: {
                        areaChart: { visible: true },
                    },
                }),
            };
            const response = await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(500);
            expect(response).toMatchSnapshot();
        });

        describe('when changing state property', () => {
            it('should change state to approved as super admin', async () => {
                sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
                await appRequest
                    .post('/api/dataset/save')
                    .send({ _id: freshVizId, state: 'approved' })
                    .set('Cookie', sessionCookie);

                expect(await Description.findById(freshVizId)).toHaveProperty('state', 'approved');
            });

            it('should change state to disapproved as super admin', async () => {
                sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
                await appRequest
                    .post('/api/dataset/save')
                    .send({ _id: pokemon1Id, state: 'disapproved' })
                    .set('Cookie', sessionCookie);

                expect(await Description.findById(pokemon1Id)).toHaveProperty('state', 'disapproved');
            });

            it('should change state to undefined as super admin', async () => {
                sessionCookie = await loginAndGetSessionCookie(appRequest, superUser);
                await appRequest
                    .post('/api/dataset/save')
                    .send({ _id: pokemon1Id, state: null })
                    .set('Cookie', sessionCookie);

                expect(await Description.findById(pokemon1Id)).toHaveProperty('state', undefined);
            });

            it('should change state to undefined as team admin', async () => {
                await appRequest
                    .post('/api/dataset/save')
                    .send({ _id: pokemon1Id, state: null })
                    .set('Cookie', sessionCookie);

                expect(await Description.findById(pokemon1Id)).toHaveProperty('state', undefined);
            });

            it('should not allow team admin to change state to approved', async () => {
                await appRequest
                    .post('/api/dataset/save')
                    .send({ _id: freshVizId, state: 'approved' })
                    .set('Cookie', sessionCookie);

                expect(await Description.findById(freshVizId)).toHaveProperty('state', undefined);
            });

            it('should not allow team admin to change state to disapproved', async () => {
                await appRequest
                    .post('/api/dataset/save')
                    .send({ _id: freshVizId, state: 'disapproved' })
                    .set('Cookie', sessionCookie);

                expect(await Description.findById(freshVizId)).toHaveProperty('state', undefined);
            });
        });
    });

    describe('Update', () => {
        it('should change the title to Pokemon1', async () => {
            const response = await appRequest
                .put(`/api/dataset/update/${pokemon1Id}`)
                .send({ title: 'Pokemon1' });

            expect(response).toMatchSnapshot();
        });
    });

    describe('Draft', () => {
        it('should save dataset copy', async () => {
            const requestData = {
                objectTitle: 'Pokemon No_',
                fe_views: merge({}, publicDataset.fe_views, {
                    views: {
                        barChart: { visible: true },
                    },
                }),
            };
            const response = await appRequest
                .put(`/api/dataset/draft/${pokemon1Id}`)
                .send(requestData);

            expect(response.statusCode).toBe(200);
            expect(response).toMatchSnapshot();

            const copy = await Description.findOne({ master_id: pokemon1Id });
            expect(copy).toMatchObject(requestData);
        });

        it('should check mandatory settings', async () => {
            const requestData = {
                fe_views: merge({}, publicDataset.fe_views, {
                    views: {
                        areaChart: { visible: true },
                    },
                }),
            };
            const response = await appRequest
                .put(`/api/dataset/draft/${publicDatasetId}`)
                .send(requestData)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);
            expect(response).toMatchSnapshot();
        });
    });

    describe('Reimport', () => {
        it('should reimport google spreadsheet with the new columns', async () => {
            const requestData = {
                _id: exampleGsId,
                dirty: 1,
            };
            // Set dataset to be dirty - impose reimport.
            await appRequest
                .post('/api/dataset/save')
                .send(requestData)
                .set('Cookie', sessionCookie);

            const response = await appRequest
                .get(`/api/dataset/get/${exampleGsId}`);

            expect(response.statusCode).toBe(200);
            expect(response.body.dataset).toMatchSnapshot({
                updatedAt: expect.any(String),
                jobId: expect.any(Number),
            });
            expect(response.body.dataset.jobId).toBeGreaterThan(0);
        });
    });

    describe('canExcludeField', () => {
        it('should return 404 if url doesn`t match', async () => {
            const response = await appRequest
                .get('/api/dataset/canExcludeField/')
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(404);
        });

        it('should return valid if field is not being used', async () => {
            const response = await appRequest
                .get(`/api/dataset/canExcludeField/${pokemon1Id}/Max CP`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(200);
        });

        it('should return error if field is not being used', async () => {
            const response = await appRequest
                .get(`/api/dataset/canExcludeField/${pokemon1Id}/Name`)
                .set('Cookie', sessionCookie);

            expect(response.statusCode).toBe(400);
        });
    });
});
