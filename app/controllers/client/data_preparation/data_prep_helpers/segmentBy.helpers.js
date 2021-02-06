const moment = require('moment');

const getGroupBySegment = columnName => ({
    Day: {
        year: { $year: `$rowParams.${columnName}` },
        month: { $month: `$rowParams.${columnName}` },
        day: { $dayOfMonth: `$rowParams.${columnName}` },
    },
    Year: { year: { $year: `$rowParams.${columnName}` } },
    Month: {
        month: { $month: `$rowParams.${columnName}` },
        year: { $year: `$rowParams.${columnName}` },
    },
});

const dateFormat = {
    Day: 'DD-MM-YYYY',
    Month: 'MMM YYYY',
    Year: 'YYYY',
    None: null,
};

const getSegmentId = date => {
    if (!date) {
        return;
    }

    const { month, day, year } = date;

    if (day) {
        return moment(`${day}.${month}.${year}`, 'D.M.YYYY').format('DD-MM-YYYY');
    }
    if (month) {
        return moment(`${month}.${year}`, 'M.YYYY').format('MMM YYYY');
    }

    return year;
};

module.exports = { getGroupBySegment, getSegmentId, dateFormat };
