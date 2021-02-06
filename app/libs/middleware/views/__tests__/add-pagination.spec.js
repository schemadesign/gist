import { addPagination } from '../add-pagination';


describe('Add pagination middleware', () => {
    const expectedPaginationProp = expect.objectContaining({
        limit: 20,
        pageNumber: 1,
        skipNResults: 0,
        onPageNum: 1,
        resultsOffset: 0,
    });

    it('should handle page limit when arguments are strings', () => {
        const req = {
            query: {
                limit: '20',
                page: '1',
            },
        };

        addPagination(req, {}, jest.fn());

        expect(req).toHaveProperty('pagination', expectedPaginationProp);
    });

    it('should handle page limit when arguments are numbers', () => {
        const req = {
            query: {
                limit: 20,
                page: 1,
            },
        };

        addPagination(req, {}, jest.fn());

        expect(req).toHaveProperty('pagination', expectedPaginationProp);
    });

    it('should handle "null" page argument', () => {
        const req = {
            query: {
                limit: 20,
                page: 'null',
            },
        };

        addPagination(req, {}, jest.fn());

        expect(req).toHaveProperty('pagination', expectedPaginationProp);
    });
});
