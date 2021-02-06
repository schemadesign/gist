/* eslint-disable no-useless-escape */
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const start = require('../start.strings.json');
const strings = require('../strings.json');

// Normalize the tabs and spaces and remove newlines.
const normalizeSpacing = (str = '') =>
    str.replace(/[\t\s]{2,}/gi, ' ').replace(/(^[\s]*|[\n\r]*)/gi, '');

// Match and remove the expressions for simplified parsing alphabet.
const replaceExpressions = expressionsList => (str = '') => {
    const expressionTypes = {
        '': /{{.*?}}/gi,
        NJK: /{%.*?%}/gi,
        NJKCOMMENT: /{#.*?#}/gi,
        NGATTR: /ng-\w*=".*?"/gi,
        L10NARGS: /data-l10n-args=['"]{.*?}['"]/gi
    };

    // Replace the expressions.
    return Object.entries(expressionTypes).reduce(
        (str, [type, regex]) =>
            str.replace(regex, match => {
            // Push while we find matches.
            // Expressions matching is iterative and sometimes nested.
            // This isn't garaunteed to contain all expressions in the application because of nesting. i.e. Some expression could get clipped out by a larger expression.
                expressionsList.push(match);
                // By finding the index we deduplicate on the fly.
                let index = expressionsList.indexOf(match);
                return `$$${type}EXP${index}$$`;
            }),
        str
    );
};

const expressionMatch = /\$\$\w*exp(\d+)\$\$/gi;
const restoreExpressions = expressions => (str = '') =>
    str.replace(expressionMatch, (m, g1) => expressions[parseInt(g1)]);

const token = html => ({
    token: html.startsWith('<!') ?
        'Comment' :
        html.startsWith('</') ?
            'Close' :
            html.startsWith('<') ?
                'Tag' :
                html.endsWith('/>') ? 'CloseTag' : 'Text',
    html
});

const tokenify = (str = '') =>
    str
        .split(/(<!--.*?-->|<[^<]*>|<\/[^<]*>)/gi)
        .filter(text => text.trim().length)
        .map(text => text.trim())
        .map(token);

const combine = (...etc) => Object.assign(...etc.slice(0, 2));

const textAttrMatch = /(title|aria-label|label|alt|placeholder)="([^"]*)"/;
const getTextAttrs = (str = '') =>
    // Convert the list of objects into an object.
    (str.match(RegExp(textAttrMatch, 'gi')) || [])
        .map(attr => {
            let [, name, value] = attr.match(textAttrMatch);
            return { [name]: value };
        })
        .reduce(combine, {});

// TODO: This doesn't account for implied (true) value attributes.
const attrMatch = /([a-z][a-z0-9\-]+)="([^"]*)"/;
const getAttrs = (str = '') =>
    (str.match(RegExp(attrMatch, 'gi')) || [])
        .map(attr => {
            let [, name, value] = attr.match(attrMatch);
            return { [name]: value };
        })
        .reduce(combine, {});

const stringsArgMatch = /#{([a-z_]+)}/gi;
const stringsMatch = s =>
    new RegExp(`^\W*${s.replace(stringsArgMatch, '(.*?)')}\W*$`, 'i');
// s => new RegExp(`^.*${s.replace(/#{\d+}/gi, '.*?')}.*$`)

const setTagWithL10N = (tag, id, attrs) =>
    tag.replace(
        /\\?>$/,
        cap =>
            ` data-l10n-id="${id}"${Object.values(attrs).length ? ` data-l10n-args='${JSON.stringify(attrs).replace(/"/g, '\\"')}'` : ''}${cap}`
    );

const unfoldParentsToText = node =>
    (node ? `${node.text} ${unfoldParentsToText(node.parent)}` : '');

const getId = ({ text }) =>
    // Remove the match groups from the id and replacing with something else.
    text.replace(stringsArgMatch, 'arg').replace(/\s+/g, '-').toLowerCase();

const indent = (level, indention = '  ') => textOrLevel =>
    (typeof textOrLevel === 'string' ?
        `${new Array(level).fill(indention).join('')}${textOrLevel}` :
        indent(level + textOrLevel, indention));

const replaceWithString = (text, regex, string) =>
    (text.match(regex) ? string : text);

const noMatch = (text, regex) => !text.match(regex);

const notExpression = text => noMatch(text, expressionMatch);

// Essentially we want all combinations of exclusive choices.
// [a, b], [c, d] => [a, c], [a, d], [b, c], [b, d]
// [a, b] => [a], [b]
const combinations = (...lists) =>
    (lists.length > 1 ?
        Array.prototype.concat.apply(
            [],
            combinations(...lists.slice(1)).map(p =>
                lists[0].map(item => [item, ...p])
            )
        ) :
        lists.length ? lists[0].map(item => [item]) : []);

// This is basically a pipeline.
const expressions = [];
const files = args
    // Get all the file contents.
    .filter(filename => !filename.match(/\*/))
    .map(filename => ({ content: '' + fs.readFileSync(filename), filename }))
    // Make the content's spacing normal.
    .map(({ content, ...rest }) => ({
        content: normalizeSpacing(content),
        ...rest
    }))
    // Remove expressions in the content.
    .map(({ content, ...rest }) => ({
        content: replaceExpressions(expressions)(content),
        ...rest
    }))
    // Turn the content into tokens.
    .map(({ content, ...rest }) => ({
        tokens: tokenify(content),
        content,
        ...rest
    }))
    // Get textAttrs from tags.
    .map(({ tokens, ...rest }) => ({
        tokens: tokens.map(
            ({ html, token, ...tokenRest }) =>
                (['Tag', 'CloseTag'].includes(token) ?
                    { html, token, textAttrs: getTextAttrs(html), ...tokenRest } :
                    { html, token, ...tokenRest })
        ),
        ...rest
    }))
    // Get attrs from tags.
    .map(({ tokens, ...rest }) => ({
        tokens: tokens.map(
            ({ html, token, ...tokenRest }) =>
                (['Tag', 'CloseTag'].includes(token) ?
                    { html, token, attrs: getAttrs(html), ...tokenRest } :
                    { html, token, ...tokenRest })
        ),
        ...rest
    }))
    // Create a heirarchy of Tags and filter out unnecessary tokens.
    .map(({ tokens, ...rest }) => ({
        tokens: tokens
            .filter(({ token }) =>
                ['Text', 'Close', 'CloseTag', 'Tag'].includes(token)
            )
            .map((token, i, tokens) => {
                if (i === 0) {
                    token.parent = { isRoot: true, token: 'Root', text: '' };
                } else if (['Close'].includes(token.token)) {
                    if (['Text', 'CloseTag', 'Close'].includes(tokens[i - 1].token)) {
                        token.parent = tokens[i - 1].parent.parent;
                    } else if (['Tag'].includes(tokens[i - 1].token)) {
                        token.parent = tokens[i - 1];
                    }
                } else {
                    if (['Text', 'CloseTag', 'Close'].includes(tokens[i - 1].token)) {
                        token.parent = tokens[i - 1].parent;
                    } else if (['Tag'].includes(tokens[i - 1].token)) {
                        token.parent = tokens[i - 1];
                    }
                }

                return token;
            })
            .filter(() => ['Text', 'CloseTag', 'Tag']),
        ...rest
    }))
    // Set text to it's parent tag and filter out unnecessary tokens.
    .map(({ tokens, ...rest }) => ({
        tokens: tokens
            .map(token => {
                if (['Text'].includes(token.token)) {
                    token.parent.texts = [...(token.parent.texts || []), token.html];
                }
                return token;
            })
            .filter(() => ['CloseTag', 'Tag']),
        ...rest
    }))
    // Add filenames to tokens.
    .map(({ filename, tokens, ...rest }) => ({
        filename,
        tokens: tokens.map(token => ({ filename, ...token })),
        ...rest
    }));

/* .map(({ tokens, ...rest }) => ({
    tokens,
    ...rest
  })) */

// Print all the expressions.
// console.log(Array.from(new Set(expressions)).sort().join(' '))

// Print the matches in a grep-like format
const reExpress = restoreExpressions(expressions);
// Get all the instances of matches.
let manifest = start['main']
    .map(string => ({
        regex: stringsMatch(string),
        string,
        args: (() => {
            const groups = [];
            // Make sure that the strings work the right way.
            const regex = new RegExp(stringsArgMatch, 'gi');
            let match;
            while ((match = regex.exec(string)) !== null) {
                groups.push(match);
            }
            return groups;
        })().map(group => group[1])
    }))
    .map(({ regex, args = [], ...rest }, i) => ({
        regex,
        args,
        instances: Array.prototype.concat.apply(
            [],
            files.map(({ filename, content, tokens }) =>
                tokens
                    .filter(({ textAttrs = {}, texts = [] }) => {
                        const hasAttrMatch = Object.entries(
                            textAttrs
                        ).some(([attr, text]) => text.match(regex));
                        const hasTextMatch = texts.some(text => text.match(regex));
                        const included = hasAttrMatch || hasTextMatch;
                        /*
              if (included && texts.length > 1) {
                console.warn('Contains split text: %j', texts)
              } */
                        return included;
                    })
                    .map(({ textAttrs = {}, texts = [], ...restToken }) => ({
                        textAttrs,
                        texts,
                        known: args.length ?
                            Array.prototype.concat.apply(
                                [],
                                Object.values(textAttrs)
                                    .concat(texts)
                                    .map(text => text.match(regex))
                                    .filter(
                                        values => Array.isArray(values) && values.length > 1
                                    )
                                // The values should be the expressions and each arg value.
                                    .map(values =>
                                        values
                                            .slice(1)
                                            .map((value, i) => ({
                                                [args[i]]: value
                                            }))
                                            .filter(obj => obj instanceof Object)
                                    )
                            ) : [],
                        ...restToken
                    }))
            )
        ),
        ...rest
    }))
    // `${filename}: ${unfoldParentsToText(parent.parent)} ${setTagWithL10N(parent.text, reExpress(getId( { text, parent })))} ${reExpress(text)}`
    // Merge instances down to unique instances.
    .map(({ string, instances, ...rest }) => ({
        string,
        instances,
        inserts: instances.map(({ filename }) => filename),
        // Known is so that we can accomodate and translate specific words in context that we know will be used. These are used in the FTL file creation and not for the file insertions.
        known: Array.prototype.concat
            .apply([], instances.map(({ known }) => known))
        // Collapse known args into unique lists.
        // TODO: This should be a named function.
            .reduce((known_args, known_arg_map) => {
                for (let [arg, value] of Object.entries(known_arg_map)) {
                    let known_arg = known_args[arg];
                    known_args[arg] = known_arg ?
                        known_arg.indexOf(value) + 1 ? known_arg : known_arg.concat(value) : [value];
                }
                return known_args;
            }, {}),
        // Reduce the found instances into a primary form.
        primary: instances.reduce(
            (primary, { texts = [], textAttrs = {} }) => ({
                ...primary,
                ...textAttrs,
                text: texts[0] || primary.text
            }),
            {}
        ),
        id: getId({ text: string }),
        ...rest
    }))
    .map(({ regex, string, primary, ...rest }) => {
        const isPrimaryString = text => !noMatch(text, regex);
        return {
            regex,
            string,
            primary,
            translatable: Object.values(primary).length ?
                Object.entries(primary)
                // Is either not an expression or is a string match.
                    .filter(
                        ([, value]) =>
                            value && (notExpression(value) || isPrimaryString(value))
                    )
                    .map(([key, text]) => [key, isPrimaryString(text) ? string : text])
                    .map(([key, value]) => ({ [key]: value }))
                    .reduce(combine, {}) : { text: string },
            ...rest
        };
    })
    .map(({ regex, args, known, translatable, ...rest }) => {
        const insertKnowns = (zippedKnowns, regex) => text =>
        // Knowns is a map from argument title to some known value.
            text.replace(regex, (textMatch, ...groups) =>
                groups
                    .slice(0, -2)
                    .reduce(
                        (text, group, i) => text.replace(group, zippedKnowns[i][1]),
                        textMatch
                    )
            );

        return {
            regex,
            args,
            known,
            translatable,
            expandedTranslatableSet: Object.entries(translatable).map(
                ([attribute, text]) =>
                    (noMatch(text, regex) || !args.length ?
                        text :
                        combinations(
                            ...Object.values(known).map((vs, i) =>
                                vs
                                    .filter(k => notExpression(k))
                                    .concat(`<z${args[i]}z/>`)
                                    .map(k => {
                                        return [args[i], k];
                                    })
                            )
                        ).map(knowns => insertKnowns(knowns, regex)(text)))
            ),
            ...rest
        };
    });

console.log(manifest);
// Output English usages into strings.json format.
// Place into instances.strings.json
/*
console.log(
  JSON.stringify({
    en: _.uniq(
      _.flatten(_.flatten(manifest.map(a => a.expandedTranslatableSet)))
    )
  }, null, 2)
)
*/

/*
console.log(
  JSON.stringify(
    manifest
      .filter(a => Object.keys(a.primary).length)
      // Convert regex into a string.
      .map(({ instances, regex, ...rest }) => ({
        // Remove instances
        // instances: instances.map(({ parent, ...rest }) => rest),
        regex: regex.source,
        ...rest
      })),
    null,
    2
  )
)
*/

/*
console.log(
  JSON.stringify(
    manifest
      .filter(a => !Object.keys(a.primary).length)
      // Just show the strings with no matches.
      .map(({ string }) => string),
    null,
    2
  )
)
*/

// We want both a set of changes to be made and a manifest for creating the translations template.

// FTL File format.

const FTL = {
    Arg: arg => `{ $${arg} }`,
    ArgBranch: (key, text) => `[${key}] ${text}`,
    ArgElse: text => `*${FTL.ArgBranch('other', text)}`,
    Text: (identifier, text) =>
        `${identifier} =${typeof text === 'string' ? ` ${text}` : ''}`,
    TextAttr: (...etc) => `.${FTL.Text(...etc)}`,
    Expression: (arg, text, indent) =>
        [`{ $${arg} ->`, text, indent('}')].join('\n'),
    ExpandArgs: (text, knowns, indent, translated) => {
        if (text.match(stringsArgMatch)) {
            const [knownArg, knownValues] = Object.entries(knowns)[0];
            const nextKnowns = Object.entries(knowns).slice(1).reduce(combine, {});
            return knownValues.length ?
                FTL.Expression(
                    knownArg,
                    knownValues
                        .map(knownValue =>
                            FTL.ArgBranch(
                                knownValue,
                                Object.values(nextKnowns).length ?
                                    FTL.ExpandArgs(
                                        text.replace(`#{${knownArg}}`, knownValue),
                                        nextKnowns,
                                        indent(1),
                                        translated
                                    ) :
                                    // Translate the whole string.
                                    translated(text.replace(`#{${knownArg}}`, knownValue))
                            )
                        )
                        .concat(
                            FTL.ArgElse(
                                // Just translate the string containing the argument.
                                translated(text).replace(`#{${knownArg}}`, FTL.Arg(knownArg))
                            )
                        )
                        .map(indent(1))
                        .join('\n'),
                    indent) :
                translated(text).replace(`#{${knownArg}}`, FTL.Arg(knownArg));
        } else {
            return translated(text);
        }
    }
};

const createFTL = (
    { id, regex, translatable: { text, ...restText }, args, known, string },
    translated,
    indent
) => {
    let itBeKnown = Object.entries(known)
        .map(([key, values]) => [key, values.filter(value => notExpression(value))])
        .map(([key, values]) => ({ [key]: values }))
        .reduce(combine, {});
    return [
        FTL.Text(
            id,
            text ? FTL.ExpandArgs(text, itBeKnown, indent, translated) : undefined
        ),
        ...Object.entries(restText)
            .map(([attribute, text]) =>
                FTL.TextAttr(
                    attribute,
                    FTL.ExpandArgs(text, itBeKnown, indent(1), translated)
                )
            )
            .map(indent(1))
    ].join('\n');
};

// Write to the locales files.
Object.keys(strings).forEach(languageCode =>
    fs.writeFileSync(
        path.resolve(__dirname, `../locales/${languageCode}.ftl`),
        manifest
            .map(string =>
                createFTL(
                    string,
                    text => strings[languageCode][strings['en'].indexOf(text)],
                    indent(0, '  ')
                )
            )
            .join('\n\n'),
        { encoding: 'utf8', flag: 'w' }
    )
);

const escapeShellArg = arg => `'${arg.replace(/'/g, `'\\''`)}'`;
const expandSpaces = arg => arg.replace(/ /g,'[\\s\\n]\\{0,\\}');
const escapeSedSearchLiteral = arg =>
    arg.replace(/[\/$*.^\[\]\\]/g, m => `\\${m}`);
const escapeSedReplaceLiteral = arg => arg.replace(/[\/&]/g, m => `\\${m}`);

const SEDInsert = (id, attrs, text) => ({ filename, html, known, texts}) => {
    let find = expandSpaces(`${escapeSedSearchLiteral(restoreExpressions(expressions)(html))} ${escapeSedSearchLiteral(restoreExpressions(expressions)(texts[0]))}`);
    let replace = escapeSedReplaceLiteral(
        restoreExpressions(expressions)(
            `${setTagWithL10N(html, id, known.reduce(combine, {}))}${texts[0]}`
        )
    );
    let findAndReplace = escapeShellArg(`s/${find}/${replace}/g`);
    return [`if [ $(cat ${filename} | grep ${escapeShellArg(find)} | wc -l) -eq 1 ]; then`,
        indent(1)(`sed -i '' ${findAndReplace} ${filename}`), `fi`].join('\n');
};

const SED = ({
    id,
    instances,
    regex,
    primary: { text, ...attrs },
    args,
    known,
    string
}) => {
    return (
        instances
            .filter(({attrs}) => !Object.keys(attrs).includes('data-l10n-id'))
            .map(SEDInsert(id, known, text))
        // .map(restoreExpressions(expressions))
            .join('\n')
    );
};

//manifest.forEach(e => console.log(SED(e)))

/* Getting the Translations working automatically. */
// TODO: We should output to a flattened format that can be translated, line by line, easily.
// NOTE: It might be informative to test the difference between many lines at once versus a single line at a time.
// TODO: Move the branching statements to the outside. ( Make the expressions recursive instead of iterative. )
// TODO: Mark words that shouldn't be translated, i.e. Gist.
// TODO: Spacing should be recursive. ( The FTL expressions should be recursive. )

/* Make the file-by-file inserts. */
// TODO: Print out a test `sed -i` script.
// TODO:
