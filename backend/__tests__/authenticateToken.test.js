const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken');

describe('authenticateToken', () => { 
    let req, res, next;
    const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('authenticateToken()', () => { 
        
        test('TC_MW_01 - should allow request to proceed when token is valid', () => {
            const payload = { id: 'user123' };
            const token = jwt.sign(payload, JWT_SECRET);
            req.headers['authorization'] = `Bearer ${token}`;

            authenticateToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.userId).toBe(payload.id);
        });

        test('TC_MW_02 - should return 401 when Authorization header is missing', () => {
            req.headers['authorization'] = undefined;

            authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No token provided'
            });
        });

        test('TC_MW_03 - should return 401 when token is invalid or tampered', () => {
            req.headers['authorization'] = "Bearer invalid_token_xyz";

            authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid token'
            });
        });
    });
});