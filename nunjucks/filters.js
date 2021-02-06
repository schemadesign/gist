const moment = require('moment');
const url = require('url');
const validator = require('validator');
const datatypes = require('../app/libs/datasources/datatypes.js');
const { clone, constant, filter, isEqual, isString, isUndefined, kebabCase, mapValues, pick, some, startCase, toString, reduce, isObject } = require('lodash');
const { constructedFilterObj } = require('./constructed-filter-obj');
const { constructedRoutePath } = require('./../shared/url');
const { displayNumberWithComma } = require('./../shared/fields');
const { markdown, subtractMarkdown } = require('./../shared/markdown');
const { dateFormat } = require('./date-format');
const { addDate } = require('./date-format');
const { isNumber } = require('../app/controllers/client/config');
const { decodeHtmlEntity } = require('../app/controllers/client/func');
const { isEmbed } = require('../app/utils/helpers');
const { VIEW_TYPES, VIEW_TYPE_TIMELINE, VIEW_TYPE_GROUPED_GALLERY } = require('../config/view-types');

module.exports = function (nunjucks_env, env) {
    var protocol = env.USE_SSL === 'true' ? 'https://' : 'http://';
    var host = env.HOST ? env.HOST : 'localhost:9080';
    var marketingPage = protocol;

    // General/shared
    nunjucks_env.addFilter('dateFormattedAs_monthDayYear_array', function (date) {
        return moment(date).utc().format('MMM D, YYYY');
    });

    nunjucks_env.addFilter('addDate', addDate);
    nunjucks_env.addFilter('dateFormat', dateFormat);
    nunjucks_env.addFilter('unixTimestamp', function (date) {
        return moment(date).utc().unix();
    });
    nunjucks_env.addFilter('isArray', function (val) {
        return Array.isArray(val);
    });
    nunjucks_env.addFilter('isObject', function (val) {
        return typeof (val) === 'object' && val != null;
    });
    nunjucks_env.addFilter('unescapeValue', function (val) {
        if (isObject(val) || !val) {
            return val;
        }

        return Array.isArray(val) ? val.map(item => validator.unescape(item)) : validator.unescape(val);
    });
    nunjucks_env.addFilter('JSONparse', function (val) {
        try {
            return JSON.parse(validator.unescape(val));
        } catch (e) {
            if (isObject(val)) {
                return reduce(val, (acc, value, key) => {
                    acc[key] = validator.unescape(value);
                    return acc;
                }, {});
            }

            return val;
        }
    });
    nunjucks_env.addFilter('initial', function (str) {
        return toString(str).slice(0, 1).toUpperCase();
    });

    nunjucks_env.addFilter('kebabCase', function (str) {
        return kebabCase(str);
    });

    nunjucks_env.addFilter('startCase', function (str) {
        return startCase(str);
    });

    nunjucks_env.addFilter('sortViews', function (arr, viewsOrder) {

        var sorted = [];

        Object.keys(arr).forEach(function (key) {
            viewsOrder.forEach(function (viewName, i) {
                if (viewName === key) {
                    sorted[i] = {
                        name: key,
                        displayAs: arr[key].displayAs || key,
                        visible: arr[key].visible,
                    };
                }
            });
        });

        return filter(sorted, { visible: true });
    });

    nunjucks_env.addFilter('replaceViewInUrl', function (routePath_base, currentView, viewSlug) {
        // Replace last occurrence of view slug in url
        var lastPosition = routePath_base.lastIndexOf(currentView);
        return routePath_base.substring(0, lastPosition) + viewSlug + routePath_base.substring(lastPosition + currentView.length);
    });

    nunjucks_env.addFilter('generatePanelHref', function (baseUrl, defaultView = 'gallery', defaultFilterJSON, sourceKey, shareLink) {
        if (shareLink) {
            return baseUrl + shareLink;
        }

        defaultView = defaultView === VIEW_TYPE_TIMELINE ? VIEW_TYPE_GROUPED_GALLERY : defaultView;

        const defaultViewUrl = kebabCase(defaultView);
        const isNotDefault = VIEW_TYPES.indexOf(defaultViewUrl) < 0;
        const hasFilter = defaultFilterJSON !== '' && defaultFilterJSON !== null && typeof defaultFilterJSON !== 'undefined';
        const href = isNotDefault ? `/${sourceKey}` : `/${sourceKey}/${defaultViewUrl}`;
        const fullHref = hasFilter ? `${href}?${defaultFilterJSON}` : href;

        return baseUrl + fullHref;
    });

    // for gallery.html tile link
    nunjucks_env.addFilter('addNonFilterQueryToUrl', function (route, query) {
        // preview and embed don't coexist
        if (isEmbed(query)) {
            route += '?embed=true';
        } else if (query.preview === 'true' || query.preview === true) {
            route += '?preview=true';
        }

        var joinCharacter = route.indexOf('?') !== -1 ? '&' : '?';
        if (query.revision > 1) {
            route += joinCharacter + 'revision=' + query.revision;
        }
        return route;
    });

    nunjucks_env.addFilter('doesArrayContain', function (array, member) {

        if (Array.isArray(array)) {
            return array.indexOf(member) !== -1 || array.indexOf(parseInt(member)) !== -1;
        } else if (typeof array === 'string') {
            if (array == '' + member) {
                return true;
            }

            try {
                var obj = JSON.parse(array);
                if (Array.isArray(obj)) {
                    return obj.indexOf(member) !== -1 || obj.indexOf(parseInt(member)) !== -1;
                }
            } catch (e) {
                return false;
            }
        }
        return false;
    });

    nunjucks_env.addFilter('isObjectEmpty', function (obj) {
        if (typeof obj === 'undefined' || obj == null) {
            return true;
        }
        return Object.keys(obj).length === 0;
    });

    nunjucks_env.addFilter('isValidDelimited', arr => arr.length !== 0 && !isEqual(arr, ['']));

    nunjucks_env.addFilter('isDefined', variable => !isUndefined(variable));

    nunjucks_env.addFilter('alphaSortedArray', function (array) {
        return array.sort();
    });

    nunjucks_env.addFilter('arrayPick', (array, pickValues) => array.map(element => pick(element, pickValues)));

    nunjucks_env.addFilter('filterCount', function (array) {
        if (Array.isArray(array)) {
            return array.length;
        } else if (typeof array === 'string') {
            try {
                var obj = JSON.parse(array);
                if (Array.isArray(obj)) {
                    return obj.length;
                }
            } catch (e) {
            }
        }
        return 1;
    });

    nunjucks_env.addFilter('isActive', filterObj => {
        return some(filterObj, (val) => val !== '');
    });

    nunjucks_env.addFilter('regularForm', function (str) {
        return str.replace(/([A-Z])/g, ' $1').replace(/^./, function (s) {
            return s.toUpperCase();
        });

    });

    // Array views - Filter obj construction
    nunjucks_env.addFilter('constructedFilterObj', constructedFilterObj);

    nunjucks_env.addFilter('addProperty', function (columnObject, link) {
        columnObject['link'] = link;
        return columnObject;
    });

    // Array views - Filter value to display
    nunjucks_env.addFilter('filterValToDisplay', function (rawValue) {
        let filterValue = rawValue;

        const formatText = (value) => validator.unescape(decodeHtmlEntity(value));
        const formatDate = (value) => moment(formatText(value)).utc().format('MMMM Do, YYYY');

        if (typeof filterValue === 'string') {
            let clearedValue = formatText(filterValue);

            try {
                filterValue = JSON.parse(clearedValue);
            } catch (e) {
                return clearedValue;
            }
            if (typeof filterValue === 'number' || typeof filterValue === 'string') {
                return filterValue;
            }
        }

        const { min, max } = filterValue;
        let output = '';

        if (!isNaN(min)) {
            output = `${formatText(min)}  – `;
        } else if (min) {
            output += `${formatDate(min)} – `;
        }

        if (!isNaN(max)) {
            output += formatText(max);
        } else if (max) {
            output += formatDate(max);
        }

        if (Array.isArray(filterValue)) {
            output += filterValue.map(formatText).join(', ');
        }

        return output;
    });
    // Array views - Filters for bubbles
    nunjucks_env.addFilter('filterValuesForBubble', function (filterVal) {
        if (Array.isArray(filterVal)) {
            return filterVal;
        } else if (typeof filterVal === 'string') {
            try {
                var vals = JSON.parse(filterVal);

                if (Array.isArray(vals)) {
                    return vals;
                }
            } catch (e) {
            }
            return [filterVal];
        } else {
            return [filterVal];
        }
    });

    nunjucks_env.addFilter('removeComma', function (val, field, raw_rowObjects_coercionScheme) {
        if (isUndefined(field) || isNumber({ raw_rowObjects_coercionScheme }, field)) {
            return toString(val).replace(/,/g, '');
        }

        return val;
    });

    nunjucks_env.addFilter('constructedRoutePath', constructedRoutePath);

    // Object detail view - Detect/substitute the url string in the parameter with the wrapped a tag
    nunjucks_env.addFilter('substitutePlainURLs', function (str) {
        return str.toString().split(' ').map(function (el) {
            var result = url.parse(el);

            if ((result.protocol === 'http:' || result.protocol === 'https:') &&
                result.hostname !== null && result.hostname !== '') {
                return '<a href="' + el + '" target="_blank" rel="noopener noreferrer" class="color-brand ellipsis-copy">' + el + '</a>';
            } else {
                return el;
            }
        }).join(' ');
    });

    nunjucks_env.addFilter('splitSubdomain', function (srcDocPKey = '') {
        if (srcDocPKey.split(':').length == 3) {
            var i = srcDocPKey.indexOf(':');
            var substring = srcDocPKey.substring(i + 1, srcDocPKey.length);
            return substring;
        }
        return srcDocPKey;

    });

    // Object Row Coercion Data Type
    nunjucks_env.addFilter('fieldDataType_coercion_toString', function (field) {
        return datatypes.fieldDataType_coercion_toString(field);
    });

    nunjucks_env.addFilter('formatIntegerWithCommas', displayNumberWithComma);

    nunjucks_env.addFilter('extractPreviewFromBasePath', function (url) {
        var field = 'preview';
        var reg = new RegExp('[?&]' + field + '=([^&#]*)', 'i');
        var string = reg.exec(url);

        if (string && string.length > 0) {
            return string[1];
        }

    });

    nunjucks_env.addFilter('extractEmbedFromBasePath', function (url) {
        var field = 'embed';
        var reg = new RegExp('[?&]' + field + '=([^&#]*)', 'i');
        var string = reg.exec(url);

        if (string && string.length > 0) {
            return string[1];
        }

    });

    nunjucks_env.addFilter('isColorWhite', function (val) {
        const whiteRegex = RegExp(/^#(F{6}|F{3})$/, 'i');
        return whiteRegex.test(val);
    });

    nunjucks_env.addFilter('removeAllFilters', (filterObj) => mapValues(filterObj, constant('')));

    nunjucks_env.addFilter('merge', (object1, object2) => Object.assign({}, object1, object2));

    nunjucks_env.addFilter('wrapS3AssetURL', function (url) {
        if (env.GET_AUTH_S3 === 'true') {
            // Replace S3 asset url with Gist-authenticated url
            return protocol + url.replace(/https:\/\/[^/]+/, host + '/api/s3');
        } else {
            return url;
        }
    });

    var exploreURL = protocol;

    if (env.NODE_ENV !== 'enterprise') {
        exploreURL += 'app.';
    }
    if (env.NODE_ENV == 'production') {
        marketingPage += 'www.';
    }
    exploreURL += host;
    marketingPage += host;

    nunjucks_env.addGlobal('siteBaseURL', protocol + host);

    nunjucks_env.addGlobal('explore_url', exploreURL);

    nunjucks_env.addGlobal('marketing_url', marketingPage);

    const now = new Date();
    const copyrightYear = now.getFullYear();

    nunjucks_env.addGlobal('copyrightYear', copyrightYear);

    nunjucks_env.addGlobal('makeURLfrom_relativePath', function (relativePath, subdomain, datasetId, type) {
        if (!relativePath) {
            return;
        }

        if (relativePath.slice(0, 4) == 'http') {
            return relativePath;
        }

        var key = 'https://' + process.env.DO_S3_BUCKET + '.' + process.env.DO_S3_ENDPOINT + '/' + subdomain + '/datasets/' +
            datasetId + '/assets/';
        if (type == 'banner') {
            key += 'banner/' + relativePath;
        }

        return key;
    });

    nunjucks_env.addGlobal('retrieveImageURLFromDoc', function (subdomain, docPKey, datasetId, viewType, updatedAt) {

        var key = 'https://' + process.env.DO_S3_BUCKET + '.' + process.env.DO_S3_ENDPOINT + '/' + subdomain + '/datasets/' +
            datasetId + '/assets/images/';

        return key += viewType + '/' + docPKey + '?updatedAt=' + updatedAt;

    });

    nunjucks_env.addGlobal('addSubdomain', function (strSubdomain) {
        var siteBaseUrl = nunjucks_env.getGlobal('siteBaseURL');

        if (process.env.NODE_ENV == 'enterprise') {
            return siteBaseUrl;
        }

        if (!siteBaseUrl) {
            return '/team/' + strSubdomain;
        }
        var result = url.parse(siteBaseUrl);
        var urlParts = result.host.replace('www.', '');
        urlParts = [strSubdomain].concat(urlParts);

        return result.protocol + '//' + urlParts.join('.');
    });

    nunjucks_env.addGlobal('externalWebsite', function (externalWebsite) {
        var externalLink = externalWebsite;
        if (externalLink.indexOf('http') === -1) {
            externalLink = 'http://'.concat(externalLink);
        }
        return externalLink;
    });

    nunjucks_env.addGlobal('removeThisFilterValue', function (filterObject, key) {
        var filterObjectCopy = clone(filterObject);
        for (var filterKey in filterObjectCopy) {
            if (filterObjectCopy[filterKey] === '') {
                filterObjectCopy[filterKey] = undefined;
            }
        }
        delete filterObjectCopy[key];
        filterObjectCopy[key] = '';
        return filterObjectCopy;
    });

    nunjucks_env.addGlobal('humanReadableOrPlaceholder', function (filterArray, renameMultipleText) {
        if (filterArray.length > 1) {
            return renameMultipleText || '(multiple selected)';
        }

        if (!filterArray.length) {
            return '';
        }

        return isString(filterArray[0]) ? filterArray[0] : filterArray[0].humanReadable;
    });

    nunjucks_env.addFilter('createObject', (value, key) => ({ [key]: value }));
    nunjucks_env.addFilter('markdown', markdown);
    nunjucks_env.addFilter('subtractMarkdown', subtractMarkdown);
    nunjucks_env.addFilter('formatPercent', percent => {
        const percentValue = percent * 100;
        const updatedValue = Math.round(percentValue * 100) / 100;

        return `${updatedValue}%`;
    });

    nunjucks_env.addFilter('replaceTimeline', value => {
        const [pathname, params] = value.split('?');
        const replacePathname = pathname.replace(/\/timeline$/, '/grouped-gallery');
        const queryParams = params ? `?${params}` : '';

        return `${replacePathname}${queryParams}`;
    });
};
