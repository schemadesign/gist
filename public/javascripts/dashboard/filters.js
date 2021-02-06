var app = angular.module('arraysApp');

app.filter('dotless', function () {
    return function (input) {
        if (input) {
            return input.replace(/\./g, '_');
        }
    };
});
app.filter('isSuperAdmin', function () {
    return function (user) {
        if (user) {
            return user.isSuperAdmin;
        }
    };
});

app.filter('datasourceUIDFromTitle', function () {
    return function (title) {
        return _.kebabCase(title);
    };
});

app.filter('capitalize', function () {
    return function (input) {
        if (input) {
            input = input.toLowerCase();
            input = input.substring(0, 1).toUpperCase() + input.substring(1);
        }
        return input;
    };
});

app.filter('appendPluralized', function () {
    return function (input, singular, plural) {
        input = parseInt(input, 10);

        if (input === undefined) {
            return;
        }

        if (input === 0) {
            return 'No ' + input + ' ' + plural;
        } else if (input === 1) {
            return input + ' ' + singular;
        } else {
            return input + ' ' + plural;
        }
    };
});

app.filter('pluralize', function () {
    return function (input, singular, plural) {
        if (input === undefined) {
            return;
        }

        if (input === 0) {
            return 'No ' + plural;
        } else if (input === 1) {
            return singular;
        } else {
            return plural;
        }
    };
});

app.filter('typeCoercionToString', function () {
    return function (input, inferredType) {
        var data_type = (input) ? input.operation : inferredType;

        switch (data_type) {
            case 'ProxyExisting':
                return 'Proxy';
            case 'ToDate':
                return 'Date';
            case 'ToInteger':
                return 'Number';
            case 'ToFloat':
                return 'Number';
            case 'ToPercent':
                return 'Percent';
            case 'ToCurrency':
                return 'Number';
            case 'ToMarkdown':
                return 'Markdown';
            default:
                return 'Text';
        }
    };
});

app.filter('viewToName', function () {
    return function (input) {
        return input.split(/(?=[A-Z])/).join('-').toLowerCase();
    };
});

app.filter('jobTask', function () {
    return function (input) {
        if (input === 'preImport') {
            return 'Import Raw Objects';
        } else if (input === 'importProcessed') {
            return 'Import Processed Objects';
        } else if (input === 'postImport') {
            return 'Caching unique filters';
        } else if (input === 'scrapeImages') {
            return 'Image Scraping';
        }
    };
});

app.filter('omit', function () {
    return function (input, keyName) {
        var copy = angular.copy(input);
        delete copy[keyName];
        return copy;
    };
});

app.filter('isArray', function () {
    return function (input) {
        return angular.isArray(input);
    };
});

app.filter('slugify', function () {
    return function (input) {
        if (!input) {
            return;
        }

        // make lower case and trim
        var slug = input.toLowerCase().trim();

        // replace invalid chars with spaces
        slug = slug.replace(/[^a-z0-9\s-]/g, ' ');

        // replace multiple spaces or hyphens with a single hyphen
        slug = slug.replace(/[\s-]+/g, '-');

        // remove any trailing hyphens
        slug = slug.replace(/-+$/, '');

        return slug;
    };
});

app.filter('formatField', formatField)
    .filter('formatDateNow', formatDateNow)
    .filter('initial', initial);

function formatField() {
    return (input, { output_format, ...field }) => {
        return arrays.formatFieldValue(input, { ...field, outputFormat: output_format });
    };
}

function formatDateNow() {
    return (format) => {
        return arrays.formatDateValue(undefined, format);
    };
}

function initial() {
    return (input) => {
        return _.toString(input).slice(0, 1).toUpperCase();
    };
}
