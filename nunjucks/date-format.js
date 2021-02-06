var moment = require('moment');

module.exports.dateFormat = function(date, format) {
    return format ? moment.utc(date).format(format) : moment.utc(date).format('MMMM Do, YYYY');
};
