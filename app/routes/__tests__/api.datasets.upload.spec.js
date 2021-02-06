import request from 'supertest';
import path from 'path';

import app from '../../../app';
import { hydrateDb, getId } from '../../../internals/testing/backend/utils';
import { user1 } from '../../../internals/testing/backend/fixtures/users';
import {
    pokemon1,
    freshViz,
    newVizJson
} from '../../../internals/testing/backend/fixtures/datasets';

const prepareRawDatasets = (files, ext) => files.reduce((acc, fileName) => Object.assign(acc, {
    [fileName]: {
        name: `${fileName}.${ext}`,
        path: path.resolve(__dirname, `../../../internals/testing/backend/fixtures/rawDatasets/${fileName}.${ext}`),
    },
}), {});

const user1Id = getId(user1);
const pokemon1Id = getId(pokemon1);
const freshVizId = getId(freshViz);
const newVizJsonId = getId(newVizJson);
const rawDatasetsCsv = prepareRawDatasets([
    'pokemonGO',
    'childPokemon',
    'datasetNoColumnNames',
    'wrongCSVFormat',
    'multiLine',
], 'csv');
const rawDatasetsJson = prepareRawDatasets([
    'allDataTypes',
    'nestedArray'
], 'json');


describe('Datasets API', () => {
    let appRequest;

    beforeEach(async () => {
        await hydrateDb();
        appRequest = request(app);
    });

    describe('Upload', () => {
        it(`should upload dataset: ${rawDatasetsCsv.pokemonGO.name}`, async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', freshVizId)
                .attach('file', rawDatasetsCsv.pokemonGO.path, rawDatasetsCsv.pokemonGO.name);

            expect(response).toMatchSnapshot();
        });

        it(`should upload child dataset: ${rawDatasetsCsv.childPokemon.name}`, async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', pokemon1Id)
                .field('child', 'true')
                .attach('file', rawDatasetsCsv.childPokemon.path, rawDatasetsCsv.childPokemon.name);

            expect(response.statusCode).toBe(200);
            expect(response.body).toMatchSnapshot({
                _id: expect.any(String),
            });
        });

        it(`should upload multiline dataset: ${rawDatasetsCsv.multiLine.name}`, async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', pokemon1Id)
                .attach('file', rawDatasetsCsv.multiLine.path, rawDatasetsCsv.multiLine.name);

            expect(response.statusCode).toBe(200);
            expect(response.body).toMatchSnapshot({
                _id: expect.any(String),
            });
        });

        it(`should upload a replacement file: ${rawDatasetsCsv.pokemonGO.name}`, async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', user1Id)
                .field('id', pokemon1Id)
                .field('replacement', 'true')
                .attach('file', rawDatasetsCsv.pokemonGO.path, rawDatasetsCsv.pokemonGO.name);

            expect(response.statusCode).toBe(200);
            expect(response.body).toMatchSnapshot({
                _id: expect.any(String),
            });
        });

        it('should fail when id of datasource not found', async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', '5a42c26e303770207ce8f83f');

            expect(response).toMatchSnapshot();
        });

        it('should fail when file extension differs from file format', async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', pokemon1Id)
                .attach('file', rawDatasetsCsv.pokemonGO.path, 'pokemonGO.json');

            expect(response.statusCode).toBe(500);
            expect(response).toMatchSnapshot();
        });

        it('should fail when upload a replacement file when file extension differs from file format', async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', pokemon1Id)
                .attach('file', rawDatasetsCsv.pokemonGO.path, 'pokemonGO.json');

            expect(response).toMatchSnapshot();
        });

        it(`should fail when upload a csv file with wrong format: ${rawDatasetsCsv.wrongCSVFormat.name}`, async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', pokemon1Id)
                .attach('file', rawDatasetsCsv.wrongCSVFormat.path, rawDatasetsCsv.wrongCSVFormat.name);

            expect(response).toMatchSnapshot();
        });

        it('should fail when upload the replacement with file of different columns numbers', async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', user1Id)
                .field('id', pokemon1Id)
                .field('replacement', 'true')
                .attach('file', rawDatasetsCsv.datasetNoColumnNames.path, rawDatasetsCsv.datasetNoColumnNames.name);

            expect(response).toMatchSnapshot();
        });

        it(`should upload valid JSON dataset: ${rawDatasetsJson.allDataTypes.name}`, async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', newVizJsonId)
                .attach('file', rawDatasetsJson.allDataTypes.path, rawDatasetsJson.allDataTypes.name);

            expect(response).toMatchSnapshot();
        });

        it('should fail on wrong JSON', async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', newVizJsonId)
                .attach('file', Buffer.from('trash}', 'utf8'), 'sampleJson.json');

            expect(response).toMatchSnapshot();
        });

        it(`should upload valid nested JSON dataset: ${rawDatasetsJson.nestedArray.name}`, async () => {
            const response = await appRequest
                .post('/api/dataset/upload')
                .field('user', JSON.stringify(user1))
                .field('id', newVizJsonId)
                .attach('file', rawDatasetsJson.allDataTypes.path, rawDatasetsJson.allDataTypes.name);

            expect(response).toMatchSnapshot();
        });
    });
});
