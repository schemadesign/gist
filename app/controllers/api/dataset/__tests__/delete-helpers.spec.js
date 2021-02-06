import { deleteSource } from '../delete-helpers';
import { hydrateDb, getId } from '../../../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';


const pokemon1id = getId(pokemon1);

describe('Delete helpers', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('deleteSource', () => {
        it('should delete source of dataset', async () => {
            const dataset = await deleteSource(pokemon1id);

            expect(dataset).toMatchSnapshot();
        });
    });
});
