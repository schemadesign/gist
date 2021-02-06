import { constructedRoutePath, extractHostname, getPreparedFilters, getRouteParams } from '../url';

describe('url', () => {
    describe('getPreparedFilters', () => {
        it('should return url', async () => {
            const data = {
                routeParams: { param: 1 },
                filterObj: { param2: 2 },
                options: { sortBy: 'asc', param3: 3 },
            };
            const result = getPreparedFilters(data);
            expect(result).toEqual({ param: 1, param2: 2, sortBy: 'asc' });
        });
    });

    describe('constructedRoutePath', () => {
        it('should return url', async () => {
            const result = constructedRoutePath('https://gist.info');
            expect(result).toEqual('https://gist.info');
        });

        it('should return url with url params', async () => {
            const result = constructedRoutePath('https://gist.info?param=1');
            expect(result).toEqual('https://gist.info?param=1');
        });

        it('should return url with params from filter object', async () => {
            const result = constructedRoutePath('https://gist.info?param=1', { param2: ' &1' });
            expect(result).toEqual('https://gist.info?param=1&param2=%20%261');
        });

        it('should return url with params form options', async () => {
            const result = constructedRoutePath('https://gist.info?param=1', { param2: 1 }, { sortBy: 1, param: 3 });
            expect(result).toEqual('https://gist.info?param=1&param2=1&sortBy=1');
        });

        it('should return url with question mark before params', async () => {
            const result = constructedRoutePath('https://gist.info', { param2: 1 });
            expect(result).toEqual('https://gist.info?param2=1');
        });

        it('should return url with table in parms', async () => {
            const result = constructedRoutePath('https://gist.info', { param: [1, 2] });
            expect(result).toEqual('https://gist.info?param%5B0%5D=1&param%5B1%5D=2');
        });

        it('should return url with unescaped values in table params for string values', async () => {
            const result = constructedRoutePath('https://gist.info', { param: ['name &amp; surname'] });
            expect(result).toEqual('https://gist.info?param%5B0%5D=name%20%26%20surname');
        });

        it('should return url with object in params', async () => {
            const result = constructedRoutePath('https://gist.info', { param: { min: 1, max: 2 } });
            expect(result).toEqual('https://gist.info?param%5Bmin%5D=1&param%5Bmax%5D=2');
        });

        it('should replace data in url from filter object', async () => {
            const result = constructedRoutePath('https://gist.info?param=1', { param: 2 });
            expect(result).toEqual('https://gist.info?param=2');
        });

        it('should replace data in url from options', async () => {
            const result = constructedRoutePath('https://gist.info?sortBy=1', { sortBy: 2 }, { sortBy: 3 });
            expect(result).toEqual('https://gist.info?sortBy=3');
        });
    });

    describe('getRouteParams', () => {
        it('should return routeParams', async () => {
            const result = getRouteParams('https://gist.info?sortBy=1');
            expect(result).toEqual({ routeParams: { sortBy: '1' }, routePath: 'https://gist.info' });
        });

        it('should return empty routeParams with url without params', async () => {
            const result = getRouteParams('https://gist.info');
            expect(result).toEqual({ routeParams: {}, routePath: 'https://gist.info' });
        });
    });

    describe('extractHostname', () => {
        it('should return hostname', async () => {
            expect(extractHostname('gist.info')).toEqual('gist.info');
            expect(extractHostname('http://gist.info/')).toEqual('gist.info');
            expect(extractHostname('http://gist.info?param=param')).toEqual('gist.info');
            expect(extractHostname('https://www.gist.info')).toEqual('gist.info');
            expect(extractHostname('https://www.gist.info:80')).toEqual('gist.info');
            expect(extractHostname('https://www.gist.info/viz')).toEqual('gist.info');
            expect(extractHostname('https://www.gist.info:80/viz?param=param')).toEqual('gist.info');
        });
    });
});
