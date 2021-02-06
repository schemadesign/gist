import * as getHelpers from '../get-helpers';
import { hydrateDb } from '../../../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';


describe('Get helpers', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('getDatasetWithQuery', () => {
        it('should return dataset with title', async () => {
            const dataset = await getHelpers.getDatasetByQuery({ title: pokemon1.title });
            expect(dataset.statusCode).toBe(200);
            expect(dataset).toMatchSnapshot();
        });
    });
});
