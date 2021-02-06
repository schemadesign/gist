import { getRouteParams, constructedRoutePath } from '../../../shared/url';


describe('Utils', () => {
    let arrays;

    beforeAll(() => {
        window.arrays = arrays = {};
        require('../utils');
        arrays.getRouteParams = getRouteParams;
        arrays.constructedRoutePath = constructedRoutePath;
    });

    beforeEach(() => {
        window.history.pushState({}, 'Test Title', '/');
    });

    describe('updateQuery', () => {
        let options;

        beforeEach(() => {
            options = {
                routePath_withoutFilter: '/some-chart?accessibility=true&someFilter=true',
            };
            jest.spyOn(window.history, 'replaceState');
        });

        afterEach(() => {
            options = {};
        });

        it('should update routePath_withoutFilter', () => {
            options.accessibility = false;
            arrays.updateQuery(options, 'accessibility', options.accessibility);

            expect(options.routePath_withoutFilter).toEqual('/some-chart?accessibility=false&someFilter=true');
        });

        it('should update history', () => {
            arrays.updateQuery(options, 'someFilter', true);

            expect(window.history.replaceState).toHaveBeenCalledWith({}, '', 'http://localhost/?someFilter=true');
        });
    });

    describe('getDetailsViewUrl', () => {
        it('should return url', () => {
            const options = {
                revision: true,
                embedded: false,
                array_source_key: 'array_source_key',
                filterObj: { Country: ['Poland'] },
            };

            expect(arrays.getDetailsViewUrl(options, 1, 0, 'map')).toMatchSnapshot();
        });
    });

    describe('changeRoutePath', () => {
        it('should return url', () => {
            window.history.pushState({}, 'Test Title', '/oldVizName?filterToOmit=1&filterToNotOmit=1');

            const filters = {
                filter: true,
                filter2: '2',
                filter3: false,
                filter4: 1,
            };

            const toOmit = ['filterToOmit'];

            expect(arrays.changeRoutePath('', 'vizName', filters, toOmit))
                .toEqual('http://localhost/vizName?filterToNotOmit=1&filter=true&filter2=2&filter3=false&filter4=1');
        });
    });

    describe('getApiRoute', () => {
        const options = {
            subdomain: 'test',
            isExternalAccess: false,
            environment: 'production',
            sharedPage: false,
            array_source_key: 'sourceKey/',
            sharedPageId: 1,
        };

        describe('when not sharedPage', () => {
            it('should return PROD link', () => {
                const link = arrays.getApiRoute(options, 'fake/link');
                const linkEnterprise = arrays.getApiRoute({ ...options, environment: 'enterprise' }, 'fake/link');

                expect(link).toBe('https://test.gist.info/json-api/v1/datasources/sourceKey/fake/link');
                expect(linkEnterprise).toBe('https://test.gist.info/json-api/v1/datasources/sourceKey/fake/link');
            });

            it('should return STAGING link', () => {
                const link = arrays.getApiRoute({ ...options, environment: 'staging' }, 'fake/link');

                expect(link).toBe('https://test.staging.gist.info/json-api/v1/datasources/sourceKey/fake/link');
            });

            it('should return DEV link', () => {
                const link = arrays.getApiRoute({ ...options, environment: 'development' }, 'fake/link');

                expect(link).toBe('http://test.local.arrays.co:9080/json-api/v1/datasources/sourceKey/fake/link');
            });
        });

        describe('when sharedPage', (sharedOptions = { ...options, sharedPage: true }) => {
            it('should return PROD link', () => {
                const link = arrays.getApiRoute(sharedOptions, 'fake/link');
                const linkEnterprise = arrays.getApiRoute({ ...sharedOptions, environment: 'enterprise' }, 'fake/link');

                expect(link).toBe('https://test.gist.info/json-api/v1/sharedpages/1/');
                expect(linkEnterprise).toBe('https://test.gist.info/json-api/v1/sharedpages/1/');
            });

            it('should return STAGING link', () => {
                const link = arrays.getApiRoute({ ...sharedOptions, environment: 'staging' }, 'fake/link');

                expect(link).toBe('https://test.staging.gist.info/json-api/v1/sharedpages/1/');
            });

            it('should return DEV link', () => {
                const link = arrays.getApiRoute({ ...sharedOptions, environment: 'development' }, 'fake/link');

                expect(link).toBe('http://test.local.arrays.co:9080/json-api/v1/sharedpages/1/');
            });

            it('should return direct link', () => {
                const link = arrays.getApiRoute({ ...sharedOptions, environment: 'development' }, 'fake/link', true);

                expect(link).toBe('http://test.local.arrays.co:9080/json-api/v1/datasources/sourceKey/fake/link');
            });
        });
    });
});

