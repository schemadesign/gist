const CDN_PATH = process.env.CDN_PATH;

const EXTERNAL_CSS = [
    'stylesheets/build/external/common.min.css',
    'stylesheets/build/external/area-chart.min.css',
    'stylesheets/build/external/bar-chart.min.css',
    'stylesheets/build/external/line-chart.min.css',
    'stylesheets/build/external/pie-chart.min.css',
    'stylesheets/build/external/map.min.css',
    'stylesheets/build/external/treemap.min.css',
];

const BASE_VENDORS = [
    'vendors/babel-polyfill/dist/polyfill.min.js',
    'vendors/bootstrap/dist/js/bootstrap.min.js',
    'vendors/sharrre/jquery.sharrre.min.js',
    'vendors/moment/min/moment.min.js',
    'vendors/lodash/lodash.min.js',
    'vendors/validator/validator.min.js',
    'vendors/qs/dist/qs.js',
    'vendors/nunjucks/browser/nunjucks-slim.min.js',
];

const SIDEBAR_VENDOR = [
    'vendors/nouislider/distribute/nouislider.min.js',
    'vendors/file-saver/dist/FileSaver.min.js',
    'vendors/noty/lib/noty.min.js',
    'vendors/linkifyjs/dist/linkify.min.js',
    'vendors/linkifyjs/dist/linkify-html.min.js',
    'vendors/linkifyjs/dist/linkify-jquery.min.js',
];

const SIDEBAR_JAVASCRIPT = [
    'javascripts/build/main/namespaces.js',
    'javascripts/build/shared.js',
    'javascripts/build/main/utils.js',
    'javascripts/build/main/nunjuckFilters.js',
    'javascripts/build/main/main.js',
    'javascripts/build/main/modal.js',
    'javascripts/build/main/tooltip.js',
    'javascripts/build/main/formatters.js',
    'javascripts/build/main/banner.js',
    'javascripts/build/visualizations/utils.js',
    'javascripts/build/visualizations/visualization.js',
    'javascripts/build/visualizations/constants.js',
    'javascripts/build/fe-templates.js',
];

const PAGINATION_LIBRARIES = [
    'javascripts/build/fe-templates.js',
    'javascripts/build/visualizations/html-visualization/html-visualization.js',
    'javascripts/build/visualizations/html-visualization/pagination/pagination.js',
    'javascripts/build/visualizations/html-visualization/pagination/limit-dropdown.js',
    'javascripts/build/visualizations/html-visualization/pagination/page-dropdown.js',
    'javascripts/build/visualizations/html-visualization/pagination/nav.js',
];

const JAVASCRIPT = ['vendors/jquery/dist/jquery.min.js'];

const VIEW_LIBRARIES = [
    'vendors/d3/d3.min.js',
    'vendors/textures/dist/textures.js',
    'vendors/scrollmagic/scrollmagic/minified/ScrollMagic.min.js',
    'javascripts/build/visualizations/annotations/benchmarks.js',
    'javascripts/build/visualizations/annotations/overlay-text.js',
    'javascripts/build/visualizations/d3-visualization/brush.js',
    'javascripts/build/visualizations/d3-visualization/d3-visualization.js',
    'javascripts/build/main/scroll-header.js',
];

const AREA_CHART_LIBRARIES = [
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/cartesian-chart.js',
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/area-chart/area-chart.js',
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/area-chart/core-area-chart.js',
    'javascripts/build/core-views/area-chart/area-chart-main.js',
];

const BAR_CHART_LIBRARIES = [
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/cartesian-chart.js',
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/bar-chart/bar-chart.js',
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/bar-chart/horizontal.js',
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/bar-chart/vertical.js',
    'javascripts/build/core-views/bar-chart/bar-chart-main.js',
];

const LINE_GRAPH_LIBRARIES = [
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/cartesian-chart.js',
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/line-chart/line-chart.js',
    'javascripts/build/visualizations/d3-visualization/cartesian-chart/line-chart/core-line-chart.js',
    'javascripts/build/core-views/line-chart/line-chart-main.js',
];

const PIE_CHART_LIBRARIES = [
    'javascripts/build/visualizations/d3-visualization/legend-list.js',
    'javascripts/build/visualizations/d3-visualization/pie-chart/pie-chart.js',
    'javascripts/build/core-views/pie-chart/pie-chart-main.js',
];

const MAPBOX_EXTERNAL_LIBRARY = 'https://api.tiles.mapbox.com/mapbox-gl-js/v1.8.1/mapbox-gl.js';

const MAP_LIBRARIES_BASE = [
    'javascripts/build/visualizations/d3-visualization/legend-list.js',
    'javascripts/build/visualizations/map/map.js',
    'javascripts/build/visualizations/map/core-map.js',
    'javascripts/build/core-views/map/map-main.js',
    'vendors/nunjucks/browser/nunjucks-slim.min.js',
];

const MAP_LIBRARIES = [MAPBOX_EXTERNAL_LIBRARY, ...MAP_LIBRARIES_BASE];

const MAP_PIN = 'images/map/map-pin.png';

const TREEMAP_LIBRARIES = [
    'vendors/d3-hierarchy/dist/d3-hierarchy.js',
    'javascripts/build/visualizations/d3-visualization/treemap/treemap.js',
    'javascripts/build/core-views/treemap/treemap-main.js',
];

const FONTS = 'fonts/**';
const NO_RENAME_LIST = ['fonts'];

const srcRename = src => {
    const folders = src.split('/');

    if (folders.length && NO_RENAME_LIST.includes(folders[0])) {
        return src;
    }

    const lastFolder = folders[folders.length - 2];

    return `${lastFolder}/${folders[folders.length - 1]}`;
};

const appendCDN = append => path => (append ? `${CDN_PATH}/${srcRename(path)}` : `/${path}`);

const getLibrariesPaths = (useCDN = false) => ({
    BASE_VENDORS: BASE_VENDORS.map(appendCDN(useCDN)),
    SIDEBAR_VENDOR: SIDEBAR_VENDOR.map(appendCDN(useCDN)),
    SIDEBAR_JAVASCRIPT: SIDEBAR_JAVASCRIPT.map(appendCDN(useCDN)),
    JAVASCRIPT: JAVASCRIPT.map(appendCDN(useCDN)),
    VIEW_LIBRARIES: VIEW_LIBRARIES.map(appendCDN(useCDN)),
    AREA_CHART_LIBRARIES: AREA_CHART_LIBRARIES.map(appendCDN(useCDN)),
    BAR_CHART_LIBRARIES: BAR_CHART_LIBRARIES.map(appendCDN(useCDN)),
    LINE_GRAPH_LIBRARIES: LINE_GRAPH_LIBRARIES.map(appendCDN(useCDN)),
    PIE_CHART_LIBRARIES: PIE_CHART_LIBRARIES.map(appendCDN(useCDN)),
    MAP_LIBRARIES: [MAPBOX_EXTERNAL_LIBRARY, ...MAP_LIBRARIES_BASE.map(appendCDN(useCDN))],
    TREEMAP_LIBRARIES: TREEMAP_LIBRARIES.map(appendCDN(useCDN)),
    PAGINATION_LIBRARIES: PAGINATION_LIBRARIES.map(appendCDN(useCDN)),
    EXTERNAL_CSS: EXTERNAL_CSS.map(appendCDN(useCDN)),
});

const getAllLibraries = () => [
    ...BASE_VENDORS,
    ...SIDEBAR_VENDOR,
    ...SIDEBAR_JAVASCRIPT,
    ...JAVASCRIPT,
    ...VIEW_LIBRARIES,
    ...AREA_CHART_LIBRARIES,
    ...BAR_CHART_LIBRARIES,
    ...LINE_GRAPH_LIBRARIES,
    ...PIE_CHART_LIBRARIES,
    ...MAP_LIBRARIES,
    ...TREEMAP_LIBRARIES,
    ...EXTERNAL_CSS,
    ...PAGINATION_LIBRARIES,
    FONTS,
    MAP_PIN,
];

module.exports = {
    EXTERNAL_CSS,
    BASE_VENDORS,
    SIDEBAR_VENDOR,
    SIDEBAR_JAVASCRIPT,
    JAVASCRIPT,
    VIEW_LIBRARIES,
    PAGINATION_LIBRARIES,
    AREA_CHART_LIBRARIES,
    BAR_CHART_LIBRARIES,
    PIE_CHART_LIBRARIES,
    LINE_GRAPH_LIBRARIES,
    MAPBOX_EXTERNAL_LIBRARY,
    MAP_LIBRARIES,
    TREEMAP_LIBRARIES,
    getLibrariesPaths,
    getAllLibraries,
    srcRename,
};
