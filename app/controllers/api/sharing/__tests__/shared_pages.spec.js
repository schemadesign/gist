import { ObjectId } from 'mongodb';
import { hydrateDb } from '../../../../../internals/testing/backend/utils';
import { getSharedPageFromShareObject } from '../shared_pages';
import SharedPage from '../../../../models/shared_pages';
import { VIEW_TYPES } from '../../../../../config/view-types';


describe('Shared Pages', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('getSharedPageFromShareObject', () => {
        VIEW_TYPES.forEach(view => it(`should datect ${view}`, async () => {
            const result = await getSharedPageFromShareObject({
                url: `http://glitter.local.arrays.co:9080/newviztest/${view}?sortBy=id`,
            });

            expect(result).toMatchObject({
                pageType: 'array_view',
                viewType: view,
                query: { sortBy: 'id' },
                dataset: ObjectId('5a4ed5572a1cf29b85201bb3'),
                isPublic: true,
                url: expect.any(String),
                subdomain: 'glitter',
            });
        }));

        it('should detect existing shared page', async () => {
            const result = await getSharedPageFromShareObject({ url: 'http://glitter.local.arrays.co:9080/s/5af05bbf497f90062e8caeba' });

            expect(result).toMatchObject({
                pageType: 'array_view',
                viewType: 'gallery',
                dataset: ObjectId('5a42c26e303770207ce8f83b'),
                query: {
                    sortBy: 'name',
                },
                isPublic: true,
                url: 'http://glitter.local.arrays.co/s/5af05bbf497f90062e8caeba',
            });
        });

        it('should detect object details', async () => {
            const result = await getSharedPageFromShareObject({ url: 'http://glitter.local.arrays.co:9080/pokemon/5b05346ad7a86407e5ef783d' });

            expect(result).toMatchObject({
                pageType: 'object_details',
                rowObjectId: '5b05346ad7a86407e5ef783d',
                dataset: ObjectId('5a42c26e303770207ce8f83b'),
                isPublic: true,
                url: expect.any(String),
                subdomain: 'glitter',
            });
        });

        it('should detect object details opened from a shared page', async () => {
            const result = await getSharedPageFromShareObject({ url: 'http://glitter.local.arrays.co:9080/s/5af05bbf497f90062e8caeba/5b05346ad7a86407e5ef783d' });

            expect(result).toMatchObject({
                pageType: 'object_details',
                rowObjectId: '5b05346ad7a86407e5ef783d',
                dataset: ObjectId('5a42c26e303770207ce8f83b'),
                isPublic: true,
                url: expect.any(String),
                subdomain: 'glitter',
            });
        });

        it('should detect custom view', async () => {
            const result = await getSharedPageFromShareObject({
                url: 'http://glitter.local.arrays.co:9080/pokemon/custom',
                renderingOptions: {
                    delay: 500,
                },
                pageType: 'customPage',
                viewType: 'customView',
            });

            expect(result).toMatchObject({
                renderingOptions: {
                    delay: 500,
                },
                pageType: 'customPage',
                viewType: 'customView',
                dataset: ObjectId('5a42c26e303770207ce8f83b'),
                isPublic: true,
                url: expect.any(String),
                subdomain: 'glitter',
            });
        });

        it('should save new shared page in db', async () => {
            const result = await getSharedPageFromShareObject({ url: 'http://glitter.local.arrays.co:9080/pokemon/gallery' });

            expect(await SharedPage.findById(result._id)).toMatchObject({
                pageType: 'array_view',
                viewType: 'gallery',
                query: {},
            });
        });
    });
});
