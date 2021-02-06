const miscHelpers = require('../misc-helpers');

import { hydrateDb, getId } from '../../../../../internals/testing/backend/utils';
import { user1 } from '../../../../../internals/testing/backend/fixtures/users';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';
import Descriptions from '../../../../models/descriptions';


const pokemon1Id = getId(pokemon1);

describe('Misc helpers', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('approvalRequest', () => {
        it('should change the state to pending', async () => {
            const dataset = await miscHelpers.approvalRequest(pokemon1Id, 'pending');
            expect(dataset.state).toBe('pending');
        });
    });

    describe('deleteBanner', () => {
        it('should delete banner', async () => {
            await Descriptions.findByIdAndUpdate(pokemon1Id, { banner: 'abc' });
            const deleteBanner = await miscHelpers.deleteBanner(pokemon1Id, user1);
            expect(deleteBanner.banner).toBeUndefined();
            const dataset = await Descriptions.findById(pokemon1Id);
            expect(dataset.banner).toBeUndefined();
        });
    });

    describe('getCachedValues', () => {
        it('should get cached value', async () => {
            const formattedValues = await miscHelpers.getCachedValues(pokemon1Id, 'title');
            expect(formattedValues).toMatchSnapshot();
        });
    });
});
