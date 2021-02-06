import Description from '../descriptions';

import { hydrateDb, getId } from '../../../internals/testing/backend/utils';
import { pokemon1, simpsons, team4ApprovedDataset } from '../../../internals/testing/backend/fixtures/datasets';


describe('Dataset Description Model', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('getShowcasedEntries', () => {
        it('should return public and approved datasets of active teams', async () => {
            const datasets = await Description.getShowcasedEntries();

            expect(datasets.map(dataset => dataset._id.toString())).toEqual([
                getId(pokemon1),
                getId(simpsons),
                getId(team4ApprovedDataset),
            ]);
        });
    });
});
