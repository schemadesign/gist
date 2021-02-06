import { pokemon1 } from '../../../../../../tests/config/datasets';
import { DATE_DURATION_DECADE } from '../../../../../config/dataTypes/date.config';
import { VIEW_TYPE_GALLERY, VIEW_TYPE_TIMELINE } from '../../../../../config/views.config';
import { getGalleryProject, getProject, getTimelineProject } from '../project.helpers';


describe('project helpers', () => {
    let dataSource;

    beforeEach(() => {
        dataSource = {};
        Object.assign(dataSource, pokemon1, {
            fe_views: {
                views: {
                    gallery: {
                        defaultSortByColumnName: 'Image URL',
                        visible: true,
                    },
                    timeline: {
                        defaultSortByColumnName: 'Image URL',
                        visible: true,
                    },
                },
                default_view: 'gallery',
            },
        });
    });

    describe('getProject', () => {
        it('should return project for gallery', () => {
            const result = getProject(VIEW_TYPE_GALLERY, dataSource, { sortBy: 'Name' });
            expect(result).toMatchSnapshot();
        });

        it('should return project for timeline', () => {
            const result = getProject(VIEW_TYPE_TIMELINE, dataSource, { sortBy: 'Name' });
            expect(result).toMatchSnapshot();
        });
    });

    describe('getGalleryProject', () => {
        it('should return project for gallery', () => {
            const result = getGalleryProject(dataSource, { sortBy: 'Name' });
            expect(result).toMatchSnapshot();
        });
    });

    describe('getTimelineProject', () => {
        it('should return project for timeline', () => {
            const result = getTimelineProject(dataSource, { sortBy: 'Name' });
            expect(result).toMatchSnapshot();
        });

        it('should return project for timeline when sorting by date', () => {
            const result = getTimelineProject(dataSource, {
                sortBy: 'Name', sortByDate: true, groupBy_realColumnName: DATE_DURATION_DECADE,
            });
            expect(result).toMatchSnapshot();
        });
    });
});
