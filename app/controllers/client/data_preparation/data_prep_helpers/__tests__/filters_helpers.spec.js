import { addDefaultFilters } from '../filters_helpers';


describe('Filters', () => {
    describe('addDefaultFilters', () => {
        it('should not add any filter', () => {
            const dataSourceDescription = {
                fe_filters: {
                    default: {},
                    fabricated: [],
                },
                fe_image: {
                    field: null,
                },
                objectTitle: 'objectTitle',
            };
            const uniqueFieldValuesByFieldName = [];

            addDefaultFilters(dataSourceDescription, uniqueFieldValuesByFieldName);

            expect([dataSourceDescription, uniqueFieldValuesByFieldName]).toMatchSnapshot();
        });
        it('should add title filters', () => {
            const dataSourceDescription = {
                fe_filters: {
                    default: {
                        'Has Title': 'Has Title',
                    },
                    fabricated: [],
                },
                fe_image: {
                    field: null,
                },
                objectTitle: 'objectTitle',
            };
            const uniqueFieldValuesByFieldName = [];

            addDefaultFilters(dataSourceDescription, uniqueFieldValuesByFieldName);

            expect([dataSourceDescription, uniqueFieldValuesByFieldName]).toMatchSnapshot();
        });

        it('should add image filters', () => {
            const dataSourceDescription = {
                fe_filters: {
                    default: {
                        'Has Title': 'Has Title',
                        'Has Image': 'Has Image',
                    },
                    fabricated: [],
                },
                fe_image: {
                    field: 'image',
                },
                objectTitle: 'objectTitle',
            };
            const uniqueFieldValuesByFieldName = [];

            addDefaultFilters(dataSourceDescription, uniqueFieldValuesByFieldName);

            expect([dataSourceDescription, uniqueFieldValuesByFieldName]).toMatchSnapshot();
        });
    });
});
