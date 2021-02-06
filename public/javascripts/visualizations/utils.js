((arrays, $, _, Qs) => {
    /**
     * Clone (deep copy) a plain Object, Array, Date, String, Number, or Boolean.
     * will work adequately for the 6 simple types I mentioned, as long as the data in the
     * objects and arrays form a tree structure. That is, there isn't more than one reference
     * to the same data in the object.
     *
     * Source: https://stackoverflow.com/questions/728360/how-do-i-correctly-clone-a-javascript-object
     *
     * @param  {Object|Array|Date|String|Number|Boolean} obj - the object to clone
     * @return {Object|Array|Date|String|Number|Boolean}     - a clone (deep copy) of the object
     */
    arrays.clone = function (obj) {
        var copy;

        // Handle the 3 simple types, and null or undefined
        if (obj == null || typeof obj !== 'object') {
            return obj;
        }

        // Handle Date
        if (obj instanceof Date) {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle Array
        if (obj instanceof Array) {
            copy = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                copy[i] = arrays.clone(obj[i]);
            }
            return copy;
        }

        // Handle Object
        if (obj instanceof Object) {
            copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) {
                    copy[attr] = arrays.clone(obj[attr]);
                }
            }
            return copy;
        }

        throw new Error('Unable to copy obj! Its type isn\'t supported.');
    };

    /**
     * bisector.
     */
    arrays.bisect = function (a, x) {
        var lo = 0;
        var hi = a.length;
        while (lo < hi) {
            var mid = lo + hi >>> 1;
            if (a[mid] < x) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        if (lo > 0 && (x - a[lo - 1]) < (a[lo] - x)) {
            lo -= 1;
        }
        return lo;
    };

    arrays.redirect = function (href) {
        window.location = href;
    };

    const validator = window.validator || {
        escape: _.identity,
        unescape: _.identity,
        isURL: _.stubFalse,
    };

    arrays.escape = function (value) {
        const string = _.trim(value);

        // skip URLs
        return validator.isURL(string) ? string : validator.escape(string);
    };

    arrays.unescape = function (value) {
        const string = _.trim(value);

        // skip URLs
        return validator.isURL(string) ? string : validator.unescape(string);
    };

    arrays.formatTick = function (d, scale, units) {
        var fixed = 0;

        // if domain is small (between 0–10), add decimals
        if (scale.domain()[0] >= 0 && scale.domain()[1] < 10) {
            fixed = 2;
        }

        var tick = arrays.orderOfMagnitude(d, fixed);

        if (units === '%') {
            tick += '%';
        }

        return tick;
    };

    arrays.getClickThroughURL = function (routePath_withoutFilter, filterObj, clickThroughView) {
        const [baseUrl, baseParams] = routePath_withoutFilter.split('?');
        const additionalParams = Qs.parse(baseParams);

        const url = clickThroughView ? `/${baseUrl.split('/')[1]}/${clickThroughView}` : baseUrl;
        const params = Qs.stringify(Object.assign({}, filterObj, additionalParams));

        return `${url}?${params}`;
    };
})(window.arrays, window.jQuery, window._, window.Qs);
