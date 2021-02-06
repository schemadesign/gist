import * as users from '../users';
import { hydrateDb } from '../../../internals/testing/backend/utils';
import { user1 } from '../../../internals/testing/backend/fixtures/users';


describe('Users Utils', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('when #getUser is called', () => {
        it('should return a user', async () => {
            const result = await users.getUser(user1._id);

            expect(result).toMatchSnapshot();
        });
    });
});
