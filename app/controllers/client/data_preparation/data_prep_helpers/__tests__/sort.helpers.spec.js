import { pokemon1 } from '../../../../../../tests/config/datasets';
import { SORT_ORDER_ASC } from '../../../../../config/sort.config';
import {
    VIEW_TYPE_GALLERY,
    VIEW_TYPE_TIMELINE,
    VIEW_TYPE_BUBBLE_CHART,
    VIEW_TYPE_SCATTERPLOT,
    VIEW_TYPE_TABLE,
} from '../../../../../config/views.config';
import { compareCreatedAt, getGallerySort, getSort, getTimelineSort } from '../sort.helpers';


describe('sort helpers', () => {
    let dataSource;

    beforeEach(() => {
        dataSource = {};
        Object.assign(dataSource, pokemon1, {
            fe_views: {
                views: {
                    gallery: {
                        defaultSortByColumnName: 'Image URL',
                        defaultSortOrderDescending: false,
                        visible: true,
                    },
                    timeline: {
                        defaultSortByColumnName: 'Image URL',
                        defaultSortOrderDescending: true,
                        visible: true,
                    },
                    table: {
                        defaultSortByColumnName: 'Image URL',
                        defaultSortOrderDescending: true,
                        visible: true,
                    },
                },
                default_view: 'gallery',
            },
        });
    });

    describe('compareCreatedAt', () => {
        it('should return 0 when values are equal', () => {
            const result = compareCreatedAt({ createdAt: 1 }, { createdAt: 1 });
            expect(result).toBe(0);
        });

        it('should return 1 when first value is bigger', () => {
            const result = compareCreatedAt({ createdAt: 2 }, { createdAt: 1 });
            expect(result).toBe(1);
        });

        it('should return -1 when first value is smaller', () => {
            const result = compareCreatedAt({ createdAt: 0 }, { createdAt: 1 });
            expect(result).toBe(-1);
        });
    });

    describe('getSort', () => {
        it('should return sort for gallery', () => {
            const result = getSort(VIEW_TYPE_GALLERY, dataSource, { sortBy: 'Name' });
            expect(result).toMatchSnapshot();
        });

        it('should return sort for timeline', () => {
            const result = getSort(VIEW_TYPE_TIMELINE, dataSource, { sortBy: 'Name' });
            expect(result).toMatchSnapshot();
        });

        it('should return sort for bubble chart', () => {
            const result = getSort(VIEW_TYPE_BUBBLE_CHART, dataSource, {
                groupBy_realColumnName: 'Date',
                defaultXAxisField: 'Data 1',
                defaultYAxisField: 'Data 2',
            });
            expect(result).toMatchSnapshot();
        });

        it('should return sort for scatterplot', () => {
            const result = getSort(VIEW_TYPE_SCATTERPLOT, dataSource, {
                defaultXAxisField: 'Data 1',
                defaultYAxisField: 'Data 2',
            });
            expect(result).toMatchSnapshot();
        });

        it('should return sort for table', () => {
            const result = getSort(VIEW_TYPE_TABLE, dataSource, { sortBy: 'Name', sortDirection: 'Descending' });
            expect(result).toMatchSnapshot();
        });
    });

    describe('getGallerySort', () => {
        it('should return sort for gallery', () => {
            const result = getGallerySort(dataSource, { sortBy: 'Name', sortDirection: SORT_ORDER_ASC });
            expect(result).toMatchSnapshot();
        });
    });

    describe('getTimelineSort', () => {
        it('should return sort for timeline', () => {
            const result = getTimelineSort(dataSource, { sortBy: 'Name', sortDirection: SORT_ORDER_ASC });
            expect(result).toMatchSnapshot();
        });
    });
});
