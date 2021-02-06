const { cond, constant, eq, stubTrue } = require('lodash');

const { VIEW_TYPE_REGIONAL_MAP } = require('../../../../config/views.config');

module.exports = {
    getMatch,
};

const equals = a => b => eq(a, b);

function getMatch(viewType, dataSource) {
    const addProject = cond([
        [equals(VIEW_TYPE_REGIONAL_MAP), () => getRegionaMapMatch(dataSource)],
        [stubTrue, constant({ rowParams: { $exists: true } })],
    ]);

    return addProject(viewType);
}


function getRegionaMapMatch(dataSource) {
    const { region, regionField } = dataSource.fe_views.views.regionalMap;
    const topoJson = require('./../../../../data/topojson/regions/' + region + '/subdivisions.topo.json');
    const listCountries = topoJson.objects.subdivisions.geometries
        .map(({ properties: { name } }) => name.split('|')[1] || name.split('|')[0]);

    return { [`rowParams.${regionField}`]: { $in: listCountries } };
}
