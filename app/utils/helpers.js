const { isEqual, trim, toString } = require('lodash');

module.exports.equals = a => b => isEqual(a, b);

module.exports.isEmbed = (query) => query.embed === 'true' || query.embed === true;

module.exports.formatColumnName = (value) => trim(toString(value).replace(/\./g, '_'));

module.exports.formatRawValues = (value) => trim(toString(value).replace(/’/g, '\'').replace(/”/g, '"'));

module.exports.addSlugIndex = (slugs, item, tilteProp = 'title') => {
    if (!slugs.length) {
        return;
    }

    let i = 2;
    const slugList = slugs.map((item) => item.slug);
    const max = i + slugList.length + 1;

    for (i; i < max; i++) {
        const newSlug = `${item.slug}-${i}`;

        if (!slugList.includes(newSlug)) {
            item.slug = newSlug;
            item[tilteProp] = `${item[tilteProp]} ${i}`;

            break;
        }
    }
};
