const winston = require('winston');
const Team = require('../../models/teams');
const MixpanelExport = require('mixpanel-data-export');
const moment = require('moment');

let panel = null;

if (process.env.MIXPANEL_API_KEY) {
    panel = new MixpanelExport({
        api_key: process.env.MIXPANEL_API_KEY,
        api_secret: process.env.MIXPANEL_API_SECRET,
    });
}

const formatString = 'YYYY-MM-DD';

// TODO should the default be year instead? or should an error be thrown?
function validateTimeUnit(unit) {
    const units = ['day', 'week', 'month', 'year'];

    if (units.indexOf(unit) === -1) {
        winston.error(unit + ' is not a valid unit of time to query.');
        unit = 'week';
    }

    return unit;
}

function unitToDays(unit) {
    const dict = {
        day: 1,
        week: 7,
        month: 30, // standard
        year: 365,
    };

    return dict[unit];
}

function validateType(type) {
    const types = ['general', 'unique', 'average'];

    if (types.indexOf(type) === -1) {
        winston.error(type + ' is not a valid type to query.');
        type = 'general';
    }

    return type;
}

/**
 * Get total pageviews, by team, for current and previous periods
 * TODO add compare parameter, to return one interval or two (unit=week returns either 7 or 14 days)
 */
module.exports.getTotalPageViews = function (req, res) {
    if (req.user) {

        const teamId = req.params.teamId;

        const unit = validateTimeUnit(req.query.unit);
        let days = unitToDays(unit);

        // TODO for now, assume these values are being compared, requiring twice the number of days
        days *= 2;
        days = capDays(days);

        const today = moment().format(formatString);
        const fromDate = moment().subtract(days, 'days').format(formatString);

        const type = validateType(req.query.type);

        Team.findById(teamId, function (err, team) {
            if (err) {
                return res.status(500).send({ error: 'An error occurred while getting total page views.' });
            }

            const teamTitle = team.title;

            if (panel) {
                panel.segmentation({
                    event: 'page viewed',
                    from_date: fromDate,
                    to_date: today,
                    where: '"' + teamTitle + '" in properties["teamTitle"]',
                    type: type,
                })
                    .then(function (response) {
                        if (!response.error) {
                            res.status(200).send(response);
                        } else {
                            winston.info(response.error);
                            res.status(500).send({ error: 'An error occurred ' });
                        }
                    });
            }
        });
    }
};

function makeSegmentationQuery(teamTitle, query) {

    const unit = validateTimeUnit(query.unit);
    let days = unitToDays(unit);
    days = capDays(days);

    const today = moment().format(formatString);
    const fromDate = moment().subtract(days, 'days').format(formatString);

    const panelQuery = {
        from_date: fromDate,
        to_date: today,
        where: `(defined (properties["$referrer"])) and (properties["teamTitle"] == "${teamTitle}")`,
        event: '',
    };

    if (query.event) {
        panelQuery.event = query.event;
    } else {
        winston.error('event is a required parameter');
    }

    if (query.on) {
        panelQuery.on = query.on;
    }

    if (query.limit) {
        panelQuery.limit = query.limit;
    }

    if (query.type) {
        panelQuery.type = validateType(query.type);
    }

    return panelQuery;
}

/**
 * Get segment by operator
 * avg, sum, max, min
 */
const getSegment = module.exports.getSegment = function (req, res) {
    if (req.user) {

        const operators = ['avg', 'sum', 'max', 'min'];
        const operator = req.params.operator;

        const teamId = req.params.teamId;

        Team.findById(teamId, function (err, team) {
            if (err) {
                return res.status(500).send({ error: 'An error occurred when finding team in get segment by operator.' });
            }

            const request = ['segmentation'];
            if (operators.includes(operator)) {
                request.push(operator);
            }

            const panelQuery = makeSegmentationQuery(team.title, req.query);

            if (panel) {
                panel.get(request, panelQuery)
                    .then(function (response) {
                        if (response.error) {
                            winston.error(response.error);
                            res.status(500).send({ error: 'An error occurred while getting segment.' });
                        } else {
                            res.status(200).send(response);
                        }
                    });
            }
        });
    }
};

/**
 * Get pageviews for each page by name
 */
module.exports.getPageViews = function (req, res) {

    req.query.event = 'page viewed';
    req.query.on = 'properties["page name"]';

    getSegment(req, res);
};

/**
 * Get referrers
 */
module.exports.getReferrers = function (req, res) {

    req.query.event = 'page viewed';
    req.query.on = 'properties["$referrer"]';
    req.query.limit = 5;

    getSegment(req, res);
};

/**
 * Get technology
 */
module.exports.getTechnology = function (req, res) {

    req.query.event = 'page viewed';
    req.query.on = 'properties["$' + req.params.technology + '"]';

    getSegment(req, res);
};

/**
 * Enforce a maximum of 365 days
 * Mixpanel (growth tier) will respond with an error if calling with > 365 days
 */
function capDays(days) {
    return days > 365 ? 365 : days;
}
