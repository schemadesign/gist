import * as uploadHelpers from '../upload-helpers';
import * as indexHelpers from '../index-helpers';

import { hydrateDb } from '../../../../../internals/testing/backend/utils';
import { pokemon1 } from '../../../../../internals/testing/backend/fixtures/datasets';

describe('UploadHelpers', () => {

    beforeEach(async () => {
        await hydrateDb();
    });

    describe('setSaveColumnsFunction', () => {
        it('should return default function when no permissions', () => {
            const func = uploadHelpers.setSaveColumnsFunction({});
            expect(func).toBe(indexHelpers.saveColumnsToRowObjects);
        });

        it('should fall back to default function when "useStandardSaveColumns" permission is set', () => {
            const func = uploadHelpers.setSaveColumnsFunction({ permissions: ['useStandardSaveColumns'] });
            expect(func).toBe(indexHelpers.saveColumnsToRowObjects);
        });

        it('should fall back to default function when there is no specific function per user', () => {
            const func = uploadHelpers.setSaveColumnsFunction({
                permissions: ['useNonStandardSaveColumns'],
                _team: { subdomain: 'none' },
            });
            expect(func).toBe(indexHelpers.saveColumnsToRowObjects);
        });

        it('should return fall back to default function when there is no method for rhodiumgroup team', () => {
            const func = uploadHelpers.setSaveColumnsFunction({
                permissions: ['useNonStandardSaveColumns'],
                _team: { subdomain: 'rhodiumgroup' },
            });
            expect(func).toBe(indexHelpers.saveColumnsToRowObjects);
        });
    });

    describe('createChild', () => {
        it('should create child dataset', async () => {
            uploadHelpers.createChild(pokemon1, (error, doc) => {
                expect(doc).toMatchSnapshot();
            });
        });
    });
});
