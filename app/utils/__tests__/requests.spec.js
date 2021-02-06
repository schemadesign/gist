import { handleError } from '../requests';
import { PublicError } from '../../libs/system/errors';


describe('Requests Utils', () => {
    describe('when #handleError is called', () => {
        let res;

        beforeEach(() => {
            res = {
                data: {},
                status(status) {
                    this.data.status = status;
                    return this;
                },
                json(data) {
                    this.data.data = data;
                    return this;
                },
            };
        });

        it('should return false when no error exists', () => {
            const result = handleError(null, {});

            expect(result).toBe(false);
        });

        it('should respond with public error', () => {
            const result = handleError(new PublicError('public error'), res);

            expect(result).toBe(true);
            expect(res.data).toMatchSnapshot();
        });

        it('should respond with server error', () => {
            const oldNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const result = handleError(new Error('example error'), res);
            expect(result).toBe(true);

            expect(res.data).toMatchSnapshot();
            process.env.NODE_ENV = oldNodeEnv;
        });

        it('should respond with custom error', () => {
            const oldNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const result = handleError(new Error('example error'), res, 'Custom response');

            expect(result).toBe(true);
            expect(res.data).toMatchSnapshot();
            process.env.NODE_ENV = oldNodeEnv;
        });
    });
});
