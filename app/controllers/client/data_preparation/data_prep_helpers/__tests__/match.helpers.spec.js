import { pokemon1 } from '../../../../../../tests/config/datasets';
import { VIEW_TYPE_GALLERY, VIEW_TYPE_REGIONAL_MAP } from '../../../../../config/views.config';
import { getMatch } from '../match.helpers';


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
                    regionalMap: {
                        regionField: 'Name',
                        region: 'EU',
                    },
                },
                default_view: 'gallery',
            },
        });
    });

    describe('getMatch', () => {
        it('should return default value', () => {
            const result = getMatch(VIEW_TYPE_GALLERY, dataSource);
            expect(result).toMatchSnapshot();
        });

        it('should return match for regional map', () => {
            const result = getMatch(VIEW_TYPE_REGIONAL_MAP, dataSource);
            expect(result).toMatchSnapshot();
        });
    });
});
