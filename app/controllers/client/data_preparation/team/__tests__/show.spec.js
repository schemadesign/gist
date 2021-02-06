import show from '../show';

describe('Homepage Index', () => {

    const vizActive = {
        articles: '',
        insights: '',
        visualizations: 'active',
    };

    const articlesActive = {
        articles: 'active',
        insights: '',
        visualizations: '',
    };

    const query = {
        page: 0,
    };

    // It should return the viewBy object with only visualizations field with a value of 'active'
    it('should return the correct viewBy for the /visualizations endpoint', async () => {
        show.BindData(
            { path: '/', query },
            { pages: {}, datasourceDescriptions: [] },
            function (a, e) {
                expect(e.viewBy).toEqual(vizActive);
            },
        );
    });
    // It should return the viewBy object with only insights field with a value of 'active'
    it('should return the correct viewBy for the /insights endpoint', async () => {
        show.BindData(
            { path: '/articles', query },
            { pages: {}, datasourceDescriptions: [] },
            function (a, e) {
                expect(e.viewBy).toEqual(articlesActive);
            },
        );
    });

    // It should return the viewBy object with only visualizations field with a value of 'active'
    it('should return the correct viewBy for the /insights endpoint', async () => {
        show.BindData(
            { path: '/articles', query },
            { pages: { length: 0 }, datasourceDescriptions: [] },
            function (a, e) {
                expect(e.viewBy).toEqual(vizActive);
            },
        );
    });

    // It should return the viewBy object with only visualization field with a value of 'active'
    // Since there are no stories in this test environment it shouldn't return a stories tab.
    it('should return the correct viewBy for the /articles endpoint', async () => {
        show.BindData(
            { path: '/insights', query },
            { pages: {}, datasourceDescriptions: [] },
            function (a, e) {
                expect(e.viewBy).toEqual(vizActive);
            },
        );
    });
});
