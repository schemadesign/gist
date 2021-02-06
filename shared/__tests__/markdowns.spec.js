import { isMarkdown, markdown, subtractMarkdown } from '../markdown';

describe('Markdown', () => {
    describe('isMarkdown', () => {
        it('should return false', async () => {
            expect(isMarkdown('text')).toBe(false);
            expect(isMarkdown('text  text')).toBe(false);
        });

        it('should return true', async () => {
            expect(isMarkdown('**text**')).toBe(true);
            expect(isMarkdown('__text__')).toBe(true);
            expect(isMarkdown('* first item  * Second item  ')).toBe(true);
            expect(isMarkdown('1. first item  2. Second item  ')).toBe(true);
            expect(isMarkdown('[link](/link)')).toBe(true);
            expect(isMarkdown('1. __first item__  2. **Second item**  3. [link](/link)    __text__')).toBe(true);
        });
    });
    describe('markdown', () => {
        it('should return bold copy', async () => {
            const copy = '**text**';
            const result = markdown(copy);

            expect(result).toEqual('<strong>text</strong>');
        });

        it('should return italic copy', async () => {
            const copy = '__text__';
            const result = markdown(copy);

            expect(result).toEqual('<i>text</i>');
        });

        it('should return copy with break', async () => {
            const copy = 'text  text';
            const result = markdown(copy);

            expect(result).toEqual('text<br>text');
        });

        it('should return copy with unordered list', async () => {
            const copy = '* first item  * Second item  ';
            const result = markdown(copy);

            expect(result).toEqual('<ul><li>first item</li><li>Second item</li></ul>');
        });

        it('should return copy with ordered list', async () => {
            const copy = '1. first item  2. Second item  ';
            const result = markdown(copy);

            expect(result).toEqual('<ol><li>first item</li><li>Second item</li></ol>');
        });

        it('should return copy with link', async () => {
            const copy = '[link](/link)';
            const result = markdown(copy);

            expect(result).toEqual('<a href="/link">link</a>');
        });

        it('should return copy with mixed formats', async () => {
            const copy = '1. __first item__  2. **Second item**  3. [link](/link)    __text__';
            const result = markdown(copy);

            expect(result).toEqual('<ol><li><i>first item</i></li><li><strong>Second item</strong></li><li><a href="/link">link</a></li></ol><br><i>text</i>');
        });

        it('should return copy with mixed formats 2', async () => {
            const copy = '**Paragraph 1**  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation __This is Italic Text__ ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.  **List 1:**  * First Item  * Second Item  **Paragraph 2**  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation __This is Italic Text__ ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.  **List 2:**  1. First Item  2. Second Item  [This is google](https://www.google.com).';
            const result = markdown(copy);

            expect(result).toEqual('<strong>Paragraph 1</strong><br>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation <i>This is Italic Text</i> ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.<br><strong>List 1:</strong><br><li>First Item</li><li>Second Item</li><br><strong>Paragraph 2</strong><br>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation <i>This is Italic Text</i> ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.<br><strong>List 2:</strong><br><ol><li>First Item</li><li>Second Item</li></ol><a href="https://www.google.com">This is google</a>.');
        });

        it('should return copy with many lists', async () => {
            const copy = '__Some tex__t  1. First item  2. Second item  **Some text**  * first item  * second item  __Some tex__t  1. First item  2. Second item  **Some text**  * first item  * second item  __Some tex__t  1. First item  2. Second item  **Some text**  * first item  * second item  ';
            const result = markdown(copy);

            expect(result).toEqual('<i>Some tex</i>t<br><ol><li>First item</li><li>Second item</li></ol><strong>Some text</strong><br><ul><li>first item</li><li>second item</li></ul><i>Some tex</i>t<br><ol><li>First item</li><li>Second item</li></ol><strong>Some text</strong><br><ul><li>first item</li><li>second item</li></ul><i>Some tex</i>t<br><ol><li>First item</li><li>Second item</li></ol><strong>Some text</strong><br><ul><li>first item</li><li>second item</li></ul>');
        });
    });

    describe('subtractMarkdown', () => {
        it('should return bold copy', async () => {
            const copy = '**text**';
            const result = subtractMarkdown(copy);

            expect(result).toEqual('text');
        });

        it('should return italic copy', async () => {
            const copy = '__text__';
            const result = subtractMarkdown(copy);

            expect(result).toEqual('text');
        });

        it('should return copy with break', async () => {
            const copy = 'text  text';
            const result = subtractMarkdown(copy);

            expect(result).toEqual('text text');
        });

        it('should return copy with unordered list', async () => {
            const copy = '* first item  * Second item  ';
            const result = subtractMarkdown(copy);

            expect(result).toEqual('* first item * Second item ');
        });

        it('should return copy with ordered list', async () => {
            const copy = '1. first item  2. Second item  ';
            const result = subtractMarkdown(copy);

            expect(result).toEqual('1. first item 2. Second item ');
        });

        it('should return copy with link', async () => {
            const copy = '[link](/link)';
            const result = subtractMarkdown(copy);

            expect(result).toEqual('link-/link');
        });

        it('should return copy with mixed formats', async () => {
            const copy = '1.  __first item__ 2.  **Second item** 3. [link](/link)';
            const result = subtractMarkdown(copy);

            expect(result).toEqual('1. first item 2. Second item 3. link-/link');
        });
    });
});
