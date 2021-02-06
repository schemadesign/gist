import User from '../users';
import { user1, hackyUser, hackyUser2, superUser } from '../../../internals/testing/backend/fixtures/users';


describe('User', () => {
    describe('isSuperAdmin', () => {
        it('should return undefined for email ending in only \'schemadesign.com\'', () => {
            const user = User(user1);

            expect(user.isSuperAdmin()).toBeFalsy();
        });

        it('should return undefined for email containing only \'schemadesign.com\'', () => {
            const user = User(hackyUser);

            expect(user.isSuperAdmin()).toBeFalsy();
        });

        it('should return undefined for email containing only \'+superuser\'', () => {
            const user = User(hackyUser2);

            expect(user.isSuperAdmin()).toBeFalsy();
        });

        it('should return true for email ending in exactly \'+superuser@schemadesign.com\'', () => {
            const user = User(superUser);
            expect(user.isSuperAdmin()).toBeTruthy();
        });
    });
});
