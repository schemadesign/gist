import fs, { createReadStream } from 'fs';
import path from 'path';

import {
    readDatasourceColumnsAndSampleRecords,
    flattenKeys,
    validateFile,
    saveColumnsToRowObjects,
    deriveKeys,
} from '../index-helpers';
import { PublicError } from '../../../../libs/system/errors';

import {
    pokemonColumns,
} from '../../../../../internals/testing/backend/fixtures/columns';
import {
    pokemonRowObjects,
} from '../../../../../internals/testing/backend/fixtures/rowObjects';

/* Just a helper to get file stream */
const getFileReadStream = (fileName) =>
    createReadStream(path.resolve(__dirname, `../../../../../internals/testing/backend/fixtures/rawDatasets/${fileName}`));

const runTestWithMockedStatSync = (fileSize, test) => {
    const oldStat = fs.statSync;
    fs.statSync = (filePath) => {
        return { size: fileSize };
    };
    test();
    fs.statSync = oldStat;
};

describe('Index Helpers', () => {
    describe('saveColumnsToRowObjects', () => {
        it('should return rowObjects', () => {
            expect(saveColumnsToRowObjects(pokemonColumns)).toEqual(pokemonRowObjects);
        });
    });

    describe('flattenKeys', () => {
        it('should not change unnested object', () => {
            const unnested = {
                key: 'val',
                other: 'other',
            };

            expect(flattenKeys(unnested)).toEqual([unnested]);
        });

        it('should unnest deep properties', () => {
            const unnested = {
                key: 'val',
                other: 'other',
                nested: {
                    moreNested: 'prop',
                    superNested: {
                        key: 'val2',
                    },
                },
            };

            expect(flattenKeys(unnested)).toEqual([{
                key: 'val',
                other: 'other',
                ['nested_moreNested']: 'prop',
                ['nested_superNested_key']: 'val2',
            }]);
        });
    });

    describe('readDatasourceColumnsAndSampleRecords', async () => {
        it('should return error when description.format does not match compatible formats', async () => {
            const description = {
                format: 'JPG',
                fileName: 'childPokemon.csv',
            };
            const fileReadStream = getFileReadStream('childPokemon.csv');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(false, description, fileReadStream, next);

            expect(next).toHaveBeenCalledWith(new PublicError('Invalid File Format: JPG'));
        });

        it('should return error when CSV dataset has only one column', async () => {
            const description = {
                format: 'CSV',
                fileName: 'oneColumn.csv',
            };
            const fileReadStream = getFileReadStream('oneColumn.csv');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(false, description, fileReadStream, next);

            expect(next).toHaveBeenCalledWith(new PublicError('Wrong number of columns, expected at least 2, found 1'));
        });

        [
            'childPokemon', 'datasetNoColumnNames', 'multiLine', 'emptyLines', 'dataIntuition',
            'lessThanTwoSamples', 'samplesFarBottom', 'allDataTypes', 'columnNamesOnly',
        ].forEach(datasetName => {
            const datasetFileName = `${datasetName}.csv`;

            it(`should parse ${datasetFileName} properly (1)`, async () => {
                const description = {
                    format: 'CSV',
                    fileName: datasetFileName,
                };
                const fileReadStream = getFileReadStream(datasetFileName);
                const next = jest.fn();

                await readDatasourceColumnsAndSampleRecords(false, description, fileReadStream, next);

                expect(next).toHaveBeenCalledTimes(1);
                expect(next.mock.calls[0]).toMatchSnapshot();
            });
        });

        it('should return error when replacement CSV has less columns than the number defined in coercionScheme', async () => {
            const description = {
                format: 'CSV',
                fileName: 'allDataTypes.csv',
                raw_rowObjects_coercionScheme: {
                    Date: { operation: 'ToDate' },
                    Number: { operation: 'ToFloat' },
                    String: { operation: 'ToString' },
                    AnotherString: { operation: 'ToString' },
                },
            };
            const fileReadStream = getFileReadStream('allDataTypes.csv');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(true, description, fileReadStream, next);

            expect(next).toHaveBeenCalledWith(new PublicError('Datasources are not compatible. Can\'t have fewer columns than previous datasource.'));
        });

        it('should return error when replacement CSV has inconsitent columns', async () => {
            const description = {
                format: 'CSV',
                fileName: 'allDataTypes.csv',
                raw_rowObjects_coercionScheme: {
                    Date: { operation: 'ToDate' },
                    DifferentColumn: { operation: 'ToFloat' },
                    String: { operation: 'ToString' },
                },
            };
            const fileReadStream = getFileReadStream('allDataTypes.csv');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(true, description, fileReadStream, next);

            expect(next).toHaveBeenCalledWith(new PublicError('Datasources are not compatible'));
        });

        it('should return new columns when new columns have been added in CSV and previous columns match', async () => {
            const description = {
                format: 'CSV',
                fileName: 'allDataTypes.csv',
                raw_rowObjects_coercionScheme: {
                    Date: { operation: 'ToDate' },
                    Number: { operation: 'ToFloat' },
                },
            };
            const fileReadStream = getFileReadStream('allDataTypes.csv');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(true, description, fileReadStream, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next.mock.calls[0]).toMatchSnapshot();
        });

        it('should return error when file has wrong JSON format', async () => {
            const description = {
                format: 'JSON',
                fileName: 'wrongJSONFormat.json',
            };
            const fileReadStream = getFileReadStream('wrongJSONFormat.json');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(false, description, fileReadStream, next);

            expect(next).toHaveBeenCalledWith(new PublicError('Wrong number of columns, expected at least 2, found 0'));
        });

        it('should return error when JSON dataset has only one column', async () => {
            const description = {
                format: 'JSON',
                fileName: 'oneColumn.json',
                JSONPath: '*',
            };
            const fileReadStream = getFileReadStream('oneColumn.json');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(false, description, fileReadStream, next);

            expect(next).toHaveBeenCalledWith(new PublicError('Wrong number of columns, expected at least 2, found 1'));
        });

        ['allDataTypes', 'samplesFarBottom', 'allDataTypes', 'lessThanTwoSamples'].forEach(datasetName => {
            const datasetFileName = `${datasetName}.json`;

            it(`should parse ${datasetFileName} properly (2)`, async () => { // TODO add columnNamesOnly
                const description = {
                    format: 'JSON',
                    fileName: datasetFileName,
                    JSONPath: '*',
                };
                const fileReadStream = getFileReadStream(datasetFileName);
                const next = jest.fn();

                await readDatasourceColumnsAndSampleRecords(false, description, fileReadStream, next);

                expect(next).toHaveBeenCalledTimes(1);
                expect(next.mock.calls[0]).toMatchSnapshot();
            });
        });

        it('should return error when replacement JSON has less columns than the number defined in coercionScheme', async () => {
            const description = {
                format: 'JSON',
                fileName: 'allDataTypes.json',
                JSONPath: '*',
                raw_rowObjects_coercionScheme: {
                    Date: { operation: 'ToDate' },
                    Number: { operation: 'ToFloat' },
                    String: { operation: 'ToString' },
                    AnotherString: { operation: 'ToString' },
                },
            };
            const fileReadStream = getFileReadStream('allDataTypes.json');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(true, description, fileReadStream, next);

            expect(next).toHaveBeenCalledWith(new PublicError('Datasources are not compatible. Can\'t have fewer columns than previous datasource.'));
        });

        it('should return error when replacement JSON has inconsitent columns', async () => {
            const description = {
                format: 'JSON',
                fileName: 'allDataTypes.json',
                JSONPath: '*',
                raw_rowObjects_coercionScheme: {
                    Date: { operation: 'ToDate' },
                    DifferentColumn: { operation: 'ToFloat' },
                    String: { operation: 'ToString' },
                },
            };
            const fileReadStream = getFileReadStream('allDataTypes.json');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(true, description, fileReadStream, next);

            expect(next).toHaveBeenCalledWith(new PublicError('Datasources are not compatible'));
        });

        it('should return new columns when new columns have been added in JSON and previous columns match', async () => {
            const description = {
                format: 'JSON',
                fileName: 'allDataTypes.json',
                JSONPath: '*',
                raw_rowObjects_coercionScheme: {
                    Date: { operation: 'ToDate' },
                    Number: { operation: 'ToFloat' },
                },
            };
            const fileReadStream = getFileReadStream('allDataTypes.json');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(true, description, fileReadStream, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next.mock.calls[0]).toMatchSnapshot();
        });

        it('should parse nestedJson.json properly (3)', async () => {
            const description = {
                format: 'JSON',
                fileName: 'nestedJson.json',
                JSONPath: 'values.*',
            };
            const fileReadStream = getFileReadStream('nestedJson.json');
            const next = jest.fn();

            await readDatasourceColumnsAndSampleRecords(false, description, fileReadStream, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next.mock.calls[0]).toMatchSnapshot();
        });
    });

    describe('validateFile', () => {

        it('should set correctly format from the file extension', () => {
            const testFile = {
                originalname: 'test.one.two.csv',
                path: 'test.one.two.csv',
                mimetype: 'text/csv',
            };
            const testDescription = { format: null };
            // This is terrible...
            runTestWithMockedStatSync(1000, () => {
                const cb = jest.fn();
                validateFile(testFile, testDescription, cb);
                expect(testDescription.format).toBe('CSV');
                expect(cb.mock.calls[0][0]).toBeNull();
            });
        });

        it('should fail when the extension is not recognized', () => {
            const testFile = {
                originalname: 'test.one.two.edf',
                path: 'test.one.two.edf',
                mimetype: 'text/csv',
            };
            const testDescription = { format: null };
            // This is terrible...
            runTestWithMockedStatSync(1000, () => {
                const cb = jest.fn();
                validateFile(testFile, testDescription, cb);
                expect(testDescription.format).toBeNull();
                expect(cb.mock.calls[0][0]).not.toBeNull();
            });
        });

        it('should fail when the mimetype is not recognized', () => {
            const testFile = {
                originalname: 'test.one.two.png',
                path: 'test.one.two.png',
                mimetype: 'image/png',
            };
            const testDescription = { format: null };
            // This is terrible...
            runTestWithMockedStatSync(1000, () => {
                const cb = jest.fn();
                validateFile(testFile, testDescription, cb);
                expect(cb.mock.calls[0][0]).not.toBeNull();
            });
        });

        it('should fail when the size of csv file exceed', () => {
            const testFile = {
                originalname: 'test.one.two.csv',
                path: 'test.one.two.csv',
                mimetype: 'text/csv',
            };
            const testDescription = { format: null };
            // This is terrible...
            runTestWithMockedStatSync(157286401, () => {
                const cb = jest.fn();
                validateFile(testFile, testDescription, cb);
                expect(cb.mock.calls[0][0]).not.toBeNull();
            });
        });

        it('should fail when the size of tsv file exceed', () => {
            const testFile = {
                originalname: 'test.one.two.csv',
                path: 'test.one.two.csv',
                mimetype: 'text/csv',
            };
            const testDescription = { format: null };
            // This is terrible...
            runTestWithMockedStatSync(157286401, () => {
                const cb = jest.fn();
                validateFile(testFile, testDescription, cb);
                expect(cb.mock.calls[0][0]).not.toBeNull();
            });
        });

        it('should fail when the size of tsv file exceed', () => {
            const testFile = {
                originalname: 'test.one.two.tsv',
                path: 'test.one.two.tsv',
                mimetype: 'text/csv',
            };
            const testDescription = { format: null };
            // This is terrible...
            runTestWithMockedStatSync(157286401, () => {
                const cb = jest.fn();
                validateFile(testFile, testDescription, cb);
                expect(cb.mock.calls[0][0]).not.toBeNull();
            });
        });

        it('should fail when the size of json file exceed', () => {
            const testFile = {
                originalname: 'test.one.two.json',
                path: 'test.one.two.json',
                mimetype: 'application/json',
            };
            const testDescription = { format: null };
            // This is terrible...
            runTestWithMockedStatSync(157286401, () => {
                const cb = jest.fn();
                validateFile(testFile, testDescription, cb);
                expect(cb.mock.calls[0][0]).not.toBeNull();
            });
        });

        it('should success when the size of json file is correct', () => {
            const testFile = {
                originalname: 'test.one.two.json',
                path: 'test.one.two.json',
                mimetype: 'application/json',
            };
            const testDescription = { format: null };
            // This is terrible...
            runTestWithMockedStatSync(1000, () => {
                const cb = jest.fn();
                validateFile(testFile, testDescription, cb);
                expect(cb.mock.calls[0][0]).toBeNull();
            });
        });
    });

    describe('deriveKeys', () => {
        it('should return * if prefix is empty', () => {
            expect(deriveKeys('', [1, 2, 3], '')).toContain('*');
        });
    });
});
