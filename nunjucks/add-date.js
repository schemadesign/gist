var moment = require('moment');

module.exports.addDate = function (date, amount, format) {
    return moment.utc(date).add(amount, format).toDate();
};

module.exports.subtractDate = function (date, amount, format) {
    return moment.utc(date).subtract(amount, format).toDate();
};
