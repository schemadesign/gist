module.exports = {
    env: {
        browser: false,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:jest/recommended'],
    rules: {
        'no-console': 0,
        'linebreak-style': [
            'error',
            'unix',
        ],
        'no-multiple-empty-lines': [
            'warn',
            {
                'max': 2,
            },
        ],
        'indent': [
            'warn',
            4,
            { 'SwitchCase': 1 },
        ],
        'quotes': [
            'warn',
            'single',
        ],
        'semi': [
            'error',
            'always',
        ],
        'block-scoped-var': [
            'error',
        ],
        'consistent-return': 0,
        'curly': [
            'error',
            'all',
        ],
        'eqeqeq': [
            'error',
        ],
        'no-eval': [
            'error',
        ],
        'no-implicit-globals': [
            'error',
        ],
        'no-implied-eval': [
            'error',
        ],
        'no-invalid-this': [
            'error',
        ],
        'no-multi-spaces': [
            'warn',
        ],
        'no-new-wrappers': [
            'error',
        ],
        'no-return-assign': [
            'error',
        ],
        'no-self-compare': [
            'error',
        ],
        'no-unmodified-loop-condition': [
            'error',
        ],
        'no-unused-expressions': [
            'error',
        ],
        'no-useless-call': [
            'error',
        ],
        'no-useless-concat': [
            'error',
        ],
        'no-useless-escape': [
            'error',
        ],
        'no-useless-return': [
            'error',
        ],
        'no-with': [
            'error',
        ],
        'yoda': [
            'error',
        ],
        'no-undef-init': [
            'error',
        ],
        'no-use-before-define': [
            'error',
            {
                'functions': false,
            },
        ],
        'array-bracket-spacing': [
            'error',
            'never',
        ],
        'block-spacing': [
            'error',
        ],
        'brace-style': [
            'error',
        ],
        'comma-spacing': [
            'error',
        ],
        'comma-style': [
            'error',
        ],
        'computed-property-spacing': [
            'error',
        ],
        'eol-last': [
            'error',
        ],
        'func-call-spacing': [
            'error',
        ],
        'func-name-matching': [
            'error',
        ],
        'key-spacing': [
            'error',
            {
                'mode': 'minimum',
            },
        ],
        'keyword-spacing': [
            'error',
        ],
        'max-statements-per-line': [
            'error',
            {
                'max': 1,
            },
        ],
        'new-parens': [
            'error',
        ],
        'no-array-constructor': [
            'error',
        ],
        'no-mixed-operators': [
            'error',
            {
                'groups': [
                    [
                        '&',
                        '|',
                        '^',
                        '~',
                        '<<',
                        '>>',
                        '>>>',
                    ],
                    [
                        '==',
                        '!=',
                        '===',
                        '!==',
                        '>',
                        '>=',
                        '<',
                        '<=',
                    ],
                    [
                        '&&',
                        '||',
                    ],
                    [
                        'in',
                        'instanceof',
                    ],
                ],
            },
        ],
        'no-new-object': [
            'error',
        ],
        'no-unneeded-ternary': [
            'error',
        ],
        'no-whitespace-before-property': [
            'error',
        ],
        'object-curly-spacing': [
            'error',
            'always',
        ],
        'one-var-declaration-per-line': [
            'error',
        ],
        'operator-assignment': [
            'error',
        ],
        'operator-linebreak': [
            'error',
            'after',
        ],
        'quote-props': [
            'error',
            'as-needed',
        ],
        'semi-spacing': [
            'error',
        ],
        'space-before-blocks': [
            'error',
        ],
        'space-in-parens': [
            'error',
            'never',
        ],
        'space-infix-ops': [
            'error',
        ],
        'space-unary-ops': [
            'error',
        ],
        'unicode-bom': [
            'error',
        ],
        'no-caller': [
            'error',
        ],
        'no-loop-func': [
            'error',
        ],
        'no-trailing-spaces': [
            'warn',
        ],
        'consistent-this': 0,
    },
    parser: 'babel-eslint',
    overrides: [
        {
            files: ['**/*.spec.js'],
            parserOptions: {
                'ecmaVersion': 2017,
                'sourceType': 'module',
            },
        },
    ],
    globals: {
        Promise: false,
        Symbol: false,
    },
};
