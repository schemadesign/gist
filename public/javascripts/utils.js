((arrays, Qs, _, callPhantom) => {
    Object.assign(arrays, {
        changeRoutePath,
        updateQuery,
        getDetailsViewUrl,
        getApiRoute,
        getDefaultOptions,
        takeScreenshot,
        equals,
        changeImageColor,
        addResizeEventListener,
        isMobileDevice,
        isMobileBreakpoint,
        isPreviewAndMobile,
        isEmbed,
        getParentHeight,
        getIframeHeight,
        isIE,
    });

    const STAGING_ENV = 'staging';
    const PRODUCTION_ENV = 'production';
    const DEVELOPMENT_ENV = 'development';
    const ENTERPRISE_ENV = 'enterprise';
    let windowWidth;

    function changeRoutePath(uid, vizName, filters = {}, toOmit = []) {
        const [baseUrl, baseParams] = location.href.split('?');
        const isShared = baseUrl.match(/\/s\/[\da-f]+/);
        const url = isShared ?
            baseUrl.replace(/\/s\/([^/]+$)/gi, `/${uid}/${vizName}`) :
            baseUrl.replace(/([^/]+$)/gi, vizName);
        const params = _.flow([Qs.parse, data => _.omit(data, toOmit), data => _.assign(data, filters), Qs.stringify])(
            baseParams
        );
        const paramsWithJoiner = params ? `?${params}` : '';

        return `${url}${paramsWithJoiner}`;
    }

    function updateQuery(options, option, value) {
        const { routePath, routeParams } = arrays.getRouteParams(location.href);
        const { routePath: routePathWithoutFilter, routeParams: routeParamsWithoutFilter } = arrays.getRouteParams(
            options.routePath_withoutFilter
        );

        routeParams[option] = value;
        routeParamsWithoutFilter[option] = value;
        options[option] = value;

        const uri = `${routePath}?${Qs.stringify(routeParams)}`;

        options.routePath_withoutFilter = `${routePathWithoutFilter}?${Qs.stringify(routeParamsWithoutFilter)}`;
        window.history.replaceState({}, '', uri);
    }

    function getDetailsViewUrl(options, id, objectIndex, viewType) {
        const routePathBase = `/${options.array_source_key}/${id}`;

        options.objectIndex = objectIndex;
        options.viewType = viewType;

        return arrays.constructedRoutePath(routePathBase, options.filterObj, options);
    }

    function getParsedSearch(isExternalAccess, subdomain) {
        const locationSearch = _.get(window, 'location.search', '');

        if (isExternalAccess) {
            return _.cond([
                [_.constant(_.isEmpty(subdomain) && _.isEmpty(locationSearch)), _.constant('')],
                [_.constant(_.isEmpty(subdomain)), _.constant(locationSearch)],
                [_.constant(_.isEmpty(locationSearch)), _.constant('?subdomain=' + subdomain)],
                [_.stubTrue, _.constant(`${locationSearch}&subdomain=${subdomain}`)],
            ])();
        }

        return locationSearch;
    }

    function getApiRoute(options, url, isObjectDetails) {
        const { environment, isExternalAccess, subdomain } = options;

        const parsedSearch = getParsedSearch(isExternalAccess, subdomain);

        const PROD_URL = `https://${subdomain}.gist.info`;
        const STAGING_URL = `https://${subdomain}.gist.info`;
        const DEV_URL = `http://${subdomain}.local.arrays.co:9080`;

        const requestUrl = _.cond([
            [equals(STAGING_ENV), _.constant(STAGING_URL)],
            [equals(PRODUCTION_ENV), _.constant(PROD_URL)],
            [equals(ENTERPRISE_ENV), _.constant(PROD_URL)],
            [equals(DEVELOPMENT_ENV), _.constant(DEV_URL)],
            [_.stubTrue, _.constant(DEV_URL)],
        ])(environment);

        if (options.sharedPage && !isObjectDetails) {
            return `${requestUrl}/json-api/v1/sharedpages/${options.sharedPageId}/${parsedSearch}`;
        }

        return `${requestUrl}/json-api/v1/datasources/${options.array_source_key}${url}${parsedSearch}`;
    }

    function getDefaultOptions() {
        const { defaultInstanceId, viewOptions = {} } = arrays;

        return viewOptions[defaultInstanceId] || window.options;
    }

    function takeScreenshot(timeout) {
        if (!_.isFunction(callPhantom)) {
            return;
        }

        const takeShot = () => callPhantom('takeShot');

        if (timeout) {
            return setTimeout(takeShot, timeout);
        }

        takeShot();
    }

    function resizeFunc(resizeHandler, allDirection = false) {
        if (allDirection || window.innerWidth !== windowWidth) {
            windowWidth = window.innerWidth;

            resizeHandler();
        }
    }

    function addResizeEventListener(resizeHandler, allDirection) {
        windowWidth = window.innerWidth;

        window.addEventListener(
            'resize',
            _.debounce(() => resizeFunc(resizeHandler, allDirection), 500)
        );
    }

    function equals(a) {
        return b => _.eq(a, b);
    }

    /**
     * Change color of provided image to match selected color.
     * @param {Image} image
     * @param {String} color
     * @param {Function} callback
     */
    function changeImageColor(image, color, callback) {
        const { width, height } = image;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        const buffer = document.createElement('canvas');
        buffer.width = width;
        buffer.height = height;
        const bufferContext = buffer.getContext('2d');

        bufferContext.fillStyle = color;
        bufferContext.fillRect(0, 0, width, height);

        bufferContext.globalCompositeOperation = 'destination-atop';
        bufferContext.drawImage(image, 0, 0);

        context.drawImage(image, 0, 0);

        context.globalAlpha = 1;
        context.drawImage(buffer, 0, 0);

        const resultImage = new Image(canvas.width, canvas.height);
        resultImage.onload = () => callback(resultImage);
        resultImage.src = canvas.toDataURL('image/png');
    }

    function isMobileDevice() {
        return typeof window.orientation !== 'undefined' || navigator.userAgent.indexOf('IEMobile') !== -1;
    }

    function isPreviewAndMobile() {
        return arrays.isMobileDevice() && $('.gist-site-content.preview').length;
    }

    function isIE() {
        const { userAgent } = navigator;

        return userAgent.includes('MSIE ') || userAgent.includes('Trident/');
    }

    function isMobileBreakpoint() {
        return window.innerWidth < arrays.constants.CUSTOM_SM_BREAKPOINT;
    }

    function isEmbed(options = {}) {
        return options.embed === 'true' || options.embed === true;
    }

    function getParentHeight() {
        try {
            return window.parent.innerHeight;
        } catch (e) {
            return window.innerHeight;
        }
    }

    function getIframeHeight() {
        const MIN_HEIGHT = 380;
        const MAX_HEIGHT = 780;
        const HEIGHT_RATIO = 0.9;
        const SCREEN_RATIO = 0.8;
        const DEVICE_HEIGHT_RATIO = 0.75;

        const { screen = {} } = window;
        const windowHeight = getParentHeight();

        if (isMobileDevice()) {
            const height = screen.height ? screen.height * SCREEN_RATIO : windowHeight;

            return Math.min(MAX_HEIGHT, Math.round(height * DEVICE_HEIGHT_RATIO));
        }

        return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, windowHeight * HEIGHT_RATIO));
    }
})(window.arrays, window.Qs, window._, window.callPhantom);
