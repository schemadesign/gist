module.exports.mandatorySettings = {
    gallery: {
        baseSettings: [{
            setting: 'defaultSortByColumnName',
            restriction: null,
        }],
    },
    pieSet: {
        baseSettings: [{
            setting: 'defaultChartByColumnName',
            restriction: null,
        }, {
            setting: 'defaultGroupByColumnName',
            restriction: null,
        }],
        additionalSettings: [{
            setting: 'pies',
            restriction: ['ToInteger', 'ToPercent', 'ToFloat'],
            multiSelect: true,
            optional: true,
        }],
    },
    pieChart: {
        baseSettings: [{
            setting: 'defaultGroupByColumnName',
            restriction: null,
        }],
    },
    lineGraph: {
        baseSettings: [{
            setting: 'defaultStackByColumnName',
            restriction: null,
        }, {
            setting: 'defaultGroupByColumnName',
            restriction: ['ToInteger', 'ToDate', 'ToFloat', 'ToPercent'],
        }],
        additionalSettings: [{
            setting: 'lines',
            restriction: ['ToInteger', 'ToPercent', 'ToFloat'],
            multiSelect: true,
            optional: true,
        }],
    },
    areaChart: {
        baseSettings: [{
            setting: 'defaultStackByColumnName',
            restriction: null,
        }, {
            setting: 'defaultGroupByColumnName',
            restriction: ['ToInteger', 'ToDate', 'ToFloat', 'ToPercent'],
        }],
        additionalSettings: [{
            setting: 'areas',
            restriction: ['ToInteger', 'ToPercent', 'ToFloat'],
            multiSelect: true,
            optional: true,
        }],
    },
    barChart: {
        baseSettings: [{
            setting: 'defaultStackByColumnName',
            restriction: null,
        }, {
            setting: 'defaultGroupByColumnName',
            restriction: null,
        }],
        additionalSettings: [{
            setting: 'bars',
            restriction: ['ToInteger', 'ToFloat', 'ToPercent'],
            multiSelect: true,
        }],
    },
    timeline: {
        baseSettings: [{
            setting: 'defaultSortByColumnName',
            restriction: null,
        }, {
            setting: 'defaultGroupByColumnName',
            restriction: ['ToString'],
            optional: true,
        }],
    },
    scatterplot: {
        baseSettings: [{
            setting: 'defaultXAxisField',
            restriction: ['ToInteger', 'ToDate', 'ToFloat', 'ToPercent'],
        }, {
            setting: 'defaultYAxisField',
            restriction: ['ToInteger', 'ToDate', 'ToFloat', 'ToPercent'],
        }, {
            setting: 'defaultAggregateByColumnName',
            restriction: ['ToInteger', 'ToFloat', 'ToPercent'],
        }],
    },
    bubbleChart: {
        baseSettings: [{
            setting: 'defaultXAxisField',
            restriction: ['ToInteger', 'ToFloat', 'ToPercent'],
        }, {
            setting: 'defaultYAxisField',
            restriction: ['ToInteger', 'ToFloat', 'ToPercent'],
        }, {
            setting: 'defaultRadiusField',
            restriction: ['ToInteger', 'ToFloat', 'ToPercent'],
        }, {
            setting: 'defaultChartByColumnName',
            restriction: ['ToString'],
        }, {
            setting: 'defaultGroupByColumnName',
            restriction: ['ToDate'],
        }],
    },
    table: {
        baseSettings: [{
            setting: 'defaultSortByColumnName',
            restriction: null,
        }],
    },
    wordCloud: {
        baseSettings: [{
            setting: 'defaultGroupByColumnName',
            restriction: null,
        }, {
            setting: 'keywords',
            restriction: ['ToArray'],
        }],
    },
    regionalMap: {
        baseSettings: [{
            setting: 'defaultAggregateByColumnName',
            restriction: ['ToInteger', 'ToPercent', 'ToFloat'],
        }],
    },
    map: {
        baseSettings: [{
            setting: 'defaultMapByColumnName',
            restriction: null,
        }, {
            setting: 'defaultAggregateByColumnName',
            restriction: ['ToInteger', 'ToCurrency', 'ToFloat'],
        }],
    },
    globe: {
        baseSettings: [{
            setting: 'coordinateTitle',
            restriction: null,
        }],
    },
    treemap: {
        baseSettings: [{
            setting: 'defaultChartByColumnName',
            restriction: null,
        }, {
            setting: 'defaultGroupByColumnName',
            restriction: null,
        }, {
            setting: 'defaultAggregateByColumnName',
            restriction: ['ToInteger', 'ToPercent', 'ToFloat'],
        }],
    },
};
