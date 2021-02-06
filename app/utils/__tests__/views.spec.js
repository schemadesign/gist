import * as views from '../views';
import { hydrateDb } from '../../../internals/testing/backend/utils';
import views1 from '../../../internals/testing/backend/fixtures/views';
import { user1 } from '../../../internals/testing/backend/fixtures/users';
import { pokemon1 } from '../../../internals/testing/backend/fixtures/datasets';

const [view1, view2] = views1;

describe('Views Utils', () => {
    beforeEach(async () => {
        await hydrateDb();
    });

    describe('when #getAllViews is called', () => {
        it('should return a list of views', async () => {
            const result = await views.getAllViews(user1._id);

            expect(result).toMatchSnapshot();
        });
    });

    describe('when #getAllViewsSettings is called', () => {
        it('should return a list of views', async () => {
            const result = await views.getAllViewsSettings(user1._id);

            expect(result).toMatchSnapshot();
        });
    });

    describe('when #getView is called', () => {
        it('should return a view', async () => {
            const result = await views.getView(view1._id);

            expect(result).toMatchSnapshot();
        });
    });

    describe('when #prepareView is called', () => {
        it('should transform an empty view', () => {
            const result = views.prepareView({});

            expect(result).toEqual({
                settings: [],
                scaffold: {},
            });
        });

        it('should add scaffold for empty settings', () => {
            const result = views.prepareView(view2);

            expect(result.scaffold).toEqual({
                defaultAggregateByColumnName: 'Number of Items',
                defaultSegmentByDuration: 'None',
                defaultSortOrderDescending: false,
                durationsAvailableForSegmentBy: ['None', 'Year', 'Month', 'Day'],
                fieldsNotAvailableAsAggregateByColumns: [],
                fieldsNotAvailableAsChartByColumns: [],
                fieldsNotAvailableAsGroupByColumns: [],
                simpleChart: false,
                valuesToExcludeByOriginalKey: [],
            });
        });
    });

    describe('when #scaffoldView is called', () => {
        it('should add scaffold to the view', () => {
            const result = views.scaffoldView(view2, pokemon1);

            expect(result.scaffold).toEqual({
                defaultAggregateByColumnName: 'Number of Items',
                defaultChartByColumnName: 'Image URL',
                defaultGroupByColumnName: 'Max HP',
                defaultSegmentByDuration: 'None',
                defaultSortOrderDescending: false,
                durationsAvailableForSegmentBy: ['None', 'Year', 'Month', 'Day'],
                fieldsNotAvailableAsAggregateByColumns: [],
                fieldsNotAvailableAsChartByColumns: [],
                fieldsNotAvailableAsGroupByColumns: [],
                pies: ['Pokemon No_'],
                simpleChart: false,
                valuesToExcludeByOriginalKey: [],
                visible: true,
            });
        });
    });
});
