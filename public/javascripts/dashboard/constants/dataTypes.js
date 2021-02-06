angular.module('arraysApp')
    .constant('DATA_TYPES', [
        { data_type: 'Date', operation: 'ToDate' },
        { data_type: 'Number', operation: 'ToInteger' },
        { data_type: 'Number with decimal cases', operation: 'ToFloat' },
        { data_type: 'Text', operation: 'ToString' },
        { data_type: 'Markdown', operation: 'ToMarkdown' },
        { data_type: 'Percent', operation: 'ToPercent' },
    ])
    .constant('ADVANCED_DATA_TYPES', [
        { data_type: 'String Trim', operation: 'ToStringTrim' },
        { data_type: 'Proxy', operation: 'ProxyExisting' },
        { data_type: 'Currency', operation: 'ToCurrency' },
    ]);

