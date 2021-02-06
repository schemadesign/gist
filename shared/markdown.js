const _ = require('lodash');
module.exports = {
    markdown,
    subtractMarkdown,
    isMarkdown,
};

const boldRegex = /(\*\*)(.*?)\1/g;
const italicRegex = /(__)(.*?)\1/g;
const breakRegex = /\s\s/g;
const isLiRegex = /^<li>.*>/g;
const breakRegexForList = /(<\/li>)(\s\s)(<li>)/g;
const orderedListRegex = /([0-9]+\.)(\s)(.+?(?=$|\s\s))/g;
const wrapOrderedListRegex = /(<li>(.*?)<\/li>)(\s\s|$)/g;
const unorderedListRegex = /(\*)(\s)(.+?(?=$|\s\s))/g;
const wrapUnorderedListRegex = /(<ol>(.*?)<\/ol>)|((<li>(.*?)<\/li>)(\s\s|$))/g;
const linkRegex = /(\[)(.*?)(\])(\()(.*?)(\))/g;
const replaceValue = (regex, replacement) => (value) => value.replace(regex, replacement);
const testRegex = a => b => a.test(b);

function isMarkdown(value) {
    const regexList = [boldRegex, italicRegex, unorderedListRegex, orderedListRegex, linkRegex];

    return regexList.some((regex) => regex.test(value));
}

function markdown(value) {
    return _.flow([
        replaceValue(boldRegex, '<strong>$2</strong>'),
        replaceValue(italicRegex, '<i>$2</i>'),
        replaceValue(linkRegex, '<a href="$5">$2</a>'),
        _.cond([
            [testRegex(orderedListRegex), _.flow([
                replaceValue(orderedListRegex, '<li>$3</li>'),
                replaceValue(breakRegexForList, '$1$3'),
                replaceValue(wrapOrderedListRegex, '<ol>$1</ol>'),
            ])],
            [_.stubTrue, (value) => value],
        ]),
        _.cond([
            [testRegex(unorderedListRegex), _.flow([
                replaceValue(unorderedListRegex, '<li>$3</li>'),
                replaceValue(breakRegexForList, '$1$3'),
                replaceValue(wrapUnorderedListRegex, (item, g1, g2, g3, g4) => isLiRegex.test(item) ? `<ul>${g4}</ul>` : item),
            ])],
            [_.stubTrue, (value) => value],
        ]),
        replaceValue(breakRegex, '<br>'),
    ])(value);
}

function subtractMarkdown(value) {
    return _.flow([
        replaceValue(boldRegex, '$2'),
        replaceValue(italicRegex, '$2'),
        replaceValue(linkRegex, '$2-$5'),
        replaceValue(orderedListRegex, '$1 $3'),
        replaceValue(unorderedListRegex, '$1 $3'),
        replaceValue(breakRegex, ' '),
    ])(value);
}
