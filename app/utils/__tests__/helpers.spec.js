import { addSlugIndex } from '../helpers';

describe('Helpers', () => {
    describe('addSlugIndex', () => {
        it('should not change item if it is first copy', () => {
            const existedCopies = [];
            const newCopy = {
                _id: '100',
                title: 'site copy',
                slug: 'site-copy',
            };

            addSlugIndex(existedCopies, newCopy);

            expect(newCopy).toMatchObject({
                _id: '100',
                title: 'site copy',
                slug: 'site-copy',
            });
        });

        it('should update item with next index', () => {
            const existedCopies = [{ slug: 'article-copy' }, { slug: 'article-copy-2' }];
            const newCopy = {
                _id: '100',
                title: 'article copy',
                slug: 'article-copy',
            };

            addSlugIndex(existedCopies, newCopy);

            expect(newCopy).toMatchObject({
                _id: '100',
                title: 'article copy 3',
                slug: 'article-copy-3',
            });
        });

        it('should update item with first available index', () => {
            const existedCopies = [{ slug: 'page-copy' }, { slug: 'page-copy-7' }];
            const newCopy = {
                _id: '100',
                title: 'page copy',
                slug: 'page-copy',
            };

            addSlugIndex(existedCopies, newCopy);

            expect(newCopy).toMatchObject({
                _id: '100',
                title: 'page copy 2',
                slug: 'page-copy-2'
            });
        });

        it('should update custom properties', () => {
            const existedCopies = [{ slug: 'article-copy' }];
            const newCopy = {
                _id: '100',
                title: 'article copy',
                subtitle: 'article copy',
                slug: 'article-copy',
            };

            addSlugIndex(existedCopies, newCopy, 'subtitle');

            expect(newCopy).toMatchObject({
                _id: '100',
                subtitle: 'article copy 2',
                slug: 'article-copy-2'
            });
        });
    });
});
