import request from 'supertest';

import app from '../../../app';
import { Lazy_Shared_ProcessedRowObject_MongooseContext } from '../../models/processed_row_objects';
import cached_values from '../../models/cached_values';
import Descriptions from '../../models/descriptions';
import { hydrateDb, getId } from '../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../internals/testing/backend/fixtures/datasets';
import {
    pokemon1RowObject1,
    pokemon1RowObject5,
    pokemon1RowObject9,
    pokemon1RowObject7Unpublished,
} from '../../../internals/testing/backend/fixtures/pokemon1ProcessedRowObjects';
import {
    pokemon1RowObject10,
} from '../../../internals/testing/backend/fixtures/notInserted_pokemon1ProcessedRowObjects';
import { pokemon1CachedValues } from '../../../internals/testing/backend/fixtures/cachedValues';

const pokemon1Id = getId(pokemon1);
const pokemonNoField = 'Pokemon No_';
const pokemonType1Field = 'Type 1';
const pokemonMaxCPField = 'Max CP';


describe('Content API', () => {
    let appRequest, ProcessedRowsModel;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
        ProcessedRowsModel = Lazy_Shared_ProcessedRowObject_MongooseContext(pokemon1Id).Model;
    });

    describe('Publish processed row object', () => {
        it('should return proper response', async () => {
            const response = await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject7Unpublished)}`)
                .send({ published: true });

            expect(response).toMatchSnapshot();
        });

        it('should update published key in db', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject7Unpublished)}`)
                .send({ published: true });

            expect(await ProcessedRowsModel.findById(getId(pokemon1RowObject7Unpublished)))
                .toHaveProperty('published', true);
        });

        it('should insert published row\'s field values to cache', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject7Unpublished)}`)
                .send({ published: true });

            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName[pokemonNoField])
                .toContain(pokemon1RowObject7Unpublished.rowParams[pokemonNoField]);
        });

        it('should update dataset modify date', async () => {
            const { updatedAt: prevUpdatedAt } = await Descriptions.findById(pokemon1Id);

            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject7Unpublished)}`)
                .send({ published: true });

            const { updatedAt: nextUpdatedAt } = await Descriptions.findById(pokemon1Id);

            expect(nextUpdatedAt.valueOf()).toBeGreaterThan(prevUpdatedAt.valueOf());
        });
    });

    describe('Remove processed row object', () => {
        it('should return proper response', async () => {
            const response = await appRequest
                .delete(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`);
            const removedRow = await ProcessedRowsModel.findById(getId(pokemon1RowObject1));

            expect(response).toMatchSnapshot();
            expect(removedRow).toBeNull();
        });

        it('should remove object from db', async () => {
            await appRequest
                .delete(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`);

            expect(await ProcessedRowsModel.findById(getId(pokemon1RowObject1))).toBeNull();
        });

        it('should remove deleted row\'s cached field values if there is no more row objects with such values', async () => {
            await appRequest
                .delete(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`);

            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName[pokemonNoField])
                .not.toContain(pokemon1RowObject1.rowParams[pokemonNoField]);

            expect(cachedValue.limitedUniqValsByColName[pokemonMaxCPField])
                .not.toContain(pokemon1RowObject1.rowParams[pokemonMaxCPField]);
        });

        it('should remove deleted row\'s cached field values if there are only unpublished rows with those values', async () => {
            await appRequest
                .delete(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject9)}`);

            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName[pokemonNoField])
                .not.toContain(pokemon1RowObject9.rowParams[pokemonNoField]);

            expect(cachedValue.limitedUniqValsByColName[pokemonType1Field])
                .not.toContain(pokemon1RowObject9.rowParams[pokemonType1Field]);
        });

        it('should not remove deleted row\'s cached field values if there are still objects with those values', async () => {
            await appRequest
                .delete(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject5)}`);

            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName[pokemonNoField])
                .not.toContain(pokemon1RowObject5.rowParams[pokemonNoField]);

            expect(cachedValue.limitedUniqValsByColName[pokemonType1Field])
                .toContain(pokemon1RowObject5.rowParams[pokemonType1Field]);
        });

        it('should update dataset modify date', async () => {
            const { updatedAt: prevUpdatedAt } = await Descriptions.findById(pokemon1Id);

            await appRequest
                .delete(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject5)}`);

            const { updatedAt: nextUpdatedAt } = await Descriptions.findById(pokemon1Id);

            expect(nextUpdatedAt.valueOf()).toBeGreaterThan(prevUpdatedAt.valueOf());
        });
    });

    describe('Create processed row object', () => {
        it('should return proper response', async () => {
            const response = await appRequest
                .post(`/api/dataset/content/${pokemon1Id}`)
                .send(pokemon1RowObject10);

            expect(response.statusCode).toBe(200);

            // this cannot be stored in snapshot as it's random for each request
            delete response.body.pKey;
            expect(response).toMatchSnapshot();
        });

        it('should create proper object in db', async () => {
            await appRequest
                .post(`/api/dataset/content/${pokemon1Id}`)
                .send(pokemon1RowObject10);

            expect(await ProcessedRowsModel.findById(getId(pokemon1RowObject10)))
                .toMatchObject({
                    ...pokemon1RowObject10,
                    _id: expect.anything(),
                    pKey: expect.anything(),
                });
        });

        it('should insert created row\'s field values to cache', async () => {
            await appRequest
                .post(`/api/dataset/content/${pokemon1Id}`)
                .send(pokemon1RowObject10);

            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName).toMatchObject({
                [pokemonNoField]: expect.arrayContaining([10]),
                [pokemonType1Field]: expect.arrayContaining(['Bug']),
            });
        });

        it('should update dataset modify date', async () => {
            const { updatedAt: prevUpdatedAt } = await Descriptions.findById(pokemon1Id);

            await appRequest
                .post(`/api/dataset/content/${pokemon1Id}`)
                .send(pokemon1RowObject10);

            const { updatedAt: nextUpdatedAt } = await Descriptions.findById(pokemon1Id);

            expect(nextUpdatedAt.valueOf()).toBeGreaterThan(prevUpdatedAt.valueOf());
        });
    });

    describe('Update row object\'s params', () => {
        it('should return proper response', async () => {
            const response = await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ rowParams: { [pokemonNoField]: 12 } });

            expect(response).toMatchSnapshot();
        });

        it('should update object in db', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ rowParams: { [pokemonNoField]: 12 } });

            expect(await ProcessedRowsModel.findById(getId(pokemon1RowObject1)))
                .toHaveProperty(['rowParams', pokemonNoField], 12);
        });

        it('should add new values to cache', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ rowParams: { [pokemonNoField]: 12, [pokemonType1Field]: 'SomethingNew' } });
            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName).toMatchObject({
                [pokemonNoField]: expect.arrayContaining([12]),
                [pokemonType1Field]: expect.arrayContaining(['SomethingNew']),
            });
        });

        it('should not add duplicate values to cache', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ rowParams: { [pokemonNoField]: 5, [pokemonType1Field]: 'Fire' } });
            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName).toMatchObject({
                [pokemonType1Field]: ['Fire', 'Grass', 'Water'],
            });
        });

        it('should remove unique values from cache', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ rowParams: { [pokemonNoField]: 5, [pokemonType1Field]: 'Fire' } });
            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName).toMatchObject({
                [pokemonNoField]: [2, 3, 4, 5, 9],
            });
        });

        it('should update dataset modify date', async () => {
            const { updatedAt: prevUpdatedAt } = await Descriptions.findById(pokemon1Id);

            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ rowParams: { [pokemonNoField]: 10 } });

            const { updatedAt: nextUpdatedAt } = await Descriptions.findById(pokemon1Id);

            expect(nextUpdatedAt.valueOf()).toBeGreaterThan(prevUpdatedAt.valueOf());
        });
    });

    describe('Unpublish processed row object', () => {
        it('should return proper response', async () => {
            const response = await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ published: false });
            const unpublishedRow = await ProcessedRowsModel.findById(getId(pokemon1RowObject1));

            expect(response).toMatchSnapshot();
            expect(unpublishedRow).not.toBeNull();
        });

        it('should update unpublished key in db', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ published: false });

            expect(await ProcessedRowsModel.findById(getId(pokemon1RowObject1)))
                .toHaveProperty('published', false);
        });

        it('should remove unpublished row\'s cached field values if there is no more row objects with such values', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ published: false });

            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName[pokemonNoField])
                .not.toContain(pokemon1RowObject1.rowParams[pokemonNoField]);
        });

        it('should remove unpublished row\'s cached field values if there are only unpublished rows with those values', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject9)}`)
                .send({ published: false });

            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName[pokemonType1Field])
                .not.toContain(pokemon1RowObject9.rowParams[pokemonType1Field]);
        });

        it('should not remove unpublished row\'s cached field values if there are still objects with those values', async () => {
            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ published: false });

            const cachedValue = await cached_values.findById(getId(pokemon1CachedValues));

            expect(cachedValue.limitedUniqValsByColName[pokemonType1Field])
                .toContain(pokemon1RowObject1.rowParams[pokemonType1Field]);
        });

        it('should update dataset modify date', async () => {
            const { updatedAt: prevUpdatedAt } = await Descriptions.findById(pokemon1Id);

            await appRequest
                .put(`/api/dataset/content/${pokemon1Id}/${getId(pokemon1RowObject1)}`)
                .send({ published: false });

            const { updatedAt: nextUpdatedAt } = await Descriptions.findById(pokemon1Id);

            expect(nextUpdatedAt.valueOf()).toBeGreaterThan(prevUpdatedAt.valueOf());
        });
    });
});
