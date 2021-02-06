import * as datasets from '../datasets';
import { hydrateDb } from '../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../internals/testing/backend/fixtures/datasets';

describe('Datasets Utils', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('when #getDataset is called', () => {
        it('should return a dataset', async () => {
            const result = await datasets.getDataset(pokemon1._id);

            expect(result).toMatchSnapshot();
        });
    });

    describe('when #hasValidDatasetSource is called', () => {
        it('should return true with a valid data source', () => {
            const datasourceDescription = {
                pipedrive: 'temp1'
            };

            expect(datasets.hasValidDatasetSource(datasourceDescription)).toBeTruthy();
            expect(datasets.hasValidDatasetSource(pokemon1)).toBeTruthy();
        });

        it('should return false with an invalid data source', () => {
            expect(datasets.hasValidDatasetSource({})).toBeFalsy();
        });
    });
});
