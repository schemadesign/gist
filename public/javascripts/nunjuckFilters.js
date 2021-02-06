(({ arrays, _ }) => {
    Object.assign(arrays, {
        addFilters,
    });

    function addFilters(configure) {
        configure.addFilter('constructedFilterObj', arrays.constructedFilterObj);

        configure.addFilter('removeComma', function(val, field, raw_rowObjects_coercionScheme) {
            if (_.isUndefined(field) || _.isNumber({ raw_rowObjects_coercionScheme }, field)) {
                return toString(val).replace(/,/g, '');
            }

            return val;
        });

        configure.addFilter('formatIntegerWithCommas', arrays.displayNumberWithComma);

        configure.addFilter('addNonFilterQueryToUrl', function(route, query) {
            // preview and embed don't coexist
            if (arrays.isEmbed(query)) {
                route += '?embed=true';
            }
            if (query.preview === 'true' || query.preview === true) {
                route += '?preview=true';
            }

            var joinCharacter = route.indexOf('?') !== -1 ? '&' : '?';
            if (query.revision > 1) {
                route += joinCharacter + 'revision=' + query.revision;
            }
            return route;
        });

        configure.addFilter('isObject', function(val) {
            return typeof val === 'object' && val !== null;
        });

        configure.addFilter('isArray', function(val) {
            return Array.isArray(val);
        });

        configure.addFilter('constructedRoutePath', arrays.constructedRoutePath);

        configure.addFilter('addProperty', function(columnObject, link) {
            columnObject['link'] = link;
            return columnObject;
        });

        configure.addFilter('merge', (object1, object2) => Object.assign({}, object1, object2));

        configure.addFilter('isColorWhite', function(val) {
            const whiteRegex = RegExp(/^#(F{6}|F{3})$/, 'i');
            return whiteRegex.test(val);
        });

        configure.addFilter('substitutePlainURLs', function(str) {
            if (!str) {
                return str;
            }

            return str
                .toString()
                .split(' ')
                .map(function(el) {
                    const result = document.createElement('a');

                    result.href = el;

                    const { protocol, hostname } = result;
                    const isValidContent = () => hostname !== window.location.hostname || _.startsWith(el, 'http');

                    if (_.startsWith(protocol, 'http') && !_.isEmpty(hostname) && isValidContent()) {
                        return `<a href="${el}" target="_blank" rel="noopener noreferrer" class="color-brand ellipsis-copy">${el}</a>`;
                    } else {
                        return el;
                    }
                })
                .join(' ');
        });

        configure.addFilter('dateFormat', function(date, format = 'MMMM Do, YYYY') {
            return moment(date)
                .utc()
                .format(format);
        });

        configure.addFilter('initial', function(str) {
            return _.toString(str)
                .slice(0, 1)
                .toUpperCase();
        });

        configure.addFilter('formatGallerySubtitle', values => {
            if (!_.isArray(values)) {
                return values;
            }

            const DISPLAY_LIMIT = 2;

            if (values.length > DISPLAY_LIMIT) {
                const rest = _.subtract(values.length, DISPLAY_LIMIT);
                const displaySubtitles = _.slice(values, 0, DISPLAY_LIMIT);

                return `${_.join(displaySubtitles, ', ')} (+${rest})`;
            }

            return _.join(values, ', ');
        });

        configure.addFilter('tableObjectLink', (url, options, objectIndex) => {
            const { filterObj } = options;
            const urlOptions = Object.assign({}, options, {
                limit: '',
                objectIndex,
                viewType: 'table',
            });

            return arrays.constructedRoutePath(url, filterObj, urlOptions);
        });

        configure.addGlobal('retrieveImageURLFromDoc', function(
            subdomain,
            docPKey,
            datasetId,
            viewType,
            updatedAt,
            bucket,
            s3Domain
        ) {
            const key = `https://${bucket}.${s3Domain}/${subdomain}/datasets/${datasetId}/assets/images/`;

            return `${key + viewType}/${docPKey}?updatedAt=${updatedAt}`;
        });

        configure.addFilter('isValidDelimited', arr => arr.length !== 0 && !_.isEqual(arr, ['']));

        configure.addFilter('alphaSortedArray', array => array.sort());
        configure.addFilter('markdown', arrays.markdown);
        configure.addFilter('subtractMarkdown', arrays.subtractMarkdown);
        configure.addFilter('formatPercent', percent => {
            const percentValue = percent * 100;
            const updatedValue = Math.round(percentValue * 100) / 100;

            return `${updatedValue}%`;
        });
    }
})(window);
