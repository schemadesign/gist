var fs = require('fs');
var marked = require('marked');

module.exports.getMarkdown = function (filePath) {
    var rawMarkdown = fs.readFileSync(filePath, 'utf-8');
    return rawMarkdown;
};

module.exports.parseMarkdown = function (markdown) {
    var options = {
        renderer: new marked.Renderer(),
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        sanitize: true,
        smartLists: true,
        smartypants: false
    };
    marked.setOptions(options);

    var lexer = new marked.Lexer(options);
    var parsedBody = marked(markdown);
    return parsedBody;
};

module.exports.replaceCharts = function (parsed) {
    var chartRE = /((?:<p>)?&lt;chart data-source-key=&quot;(?=\S*)([a-zA-Z\d_-]*)&quot; data-chart-type=&quot;(?=\S*)([a-zA-Z\d-]*)&quot; class=&quot;chart&quot; data-revision=&quot;(\d+)&quot; \/&gt;(?:<\/p>)?)/g;
    var parsedReplaced = parsed.replace(chartRE, '<div id="$2" data-source-key="$2" data-chart-type="$3" class="$3 chart" data-revision="$4"></div>');
    return parsedReplaced;
};
