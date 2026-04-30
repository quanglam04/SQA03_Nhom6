/**
 * Unit Test — authenticateToken
 * File gốc  : backend/middlewares/authenticateToken.js
 * Test file : backend/__tests__/authenticateToken.test.js
 * Người PT  : Cao Thị Thu Hương
 *
 * Rollback  : Toàn bộ test dùng jest.mock() để mock jwt,
 *             không kết nối DB thật => không có dữ liệu nào được
 *             tạo / thay đổi => KHÔNG cần rollback sau khi chạy test.
 */

const jwt = require("jsonwebtoken");
const authenticateToken = require("../middlewares/authenticateToken");

describe("authenticateToken", () => {
  let req, res, next;
  const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("authenticateToken()", () => {
    test("TC_MW_01 - Cho phép request đi tiếp khi Bearer token hợp lệ", () => {
      const payload = { id: "user123" };
      const token = jwt.sign(payload, JWT_SECRET);
      req.headers["authorization"] = `Bearer ${token}`;

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.userId).toBe(payload.id);
    });

    test("TC_MW_02 - Trả về 401 khi request không có header Authorization", () => {
      req.headers["authorization"] = undefined;

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "No token provided",
      });
    });

    test("TC_MW_03 - Trả về 401 khi token sai hoặc bị giả mạo", () => {
      req.headers["authorization"] = "Bearer invalid_token_xyz";

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid token",
      });
    });
  });
});


// ─── Branch bổ sung: decoded.id là null ──────────────────────────────────────
describe("authenticateToken() — decoded.id null branch", () => {
  // TC_AUTH_TOKEN_05
  test("TC_AUTH_TOKEN_05 — Gán req.userId = null khi token hợp lệ nhưng payload không có trường id", () => {
    // Arrange — token hợp lệ nhưng payload không có id
    const realJwt = require("jsonwebtoken");
    const secret = process.env.JWT_SECRET || "change_this_secret";
    const tokenWithoutId = realJwt.sign({ role: "guest" }, secret);

    const req = { headers: { authorization: `Bearer ${tokenWithoutId}` } };
    const res = {};
    const next = jest.fn();

    // Act
    authenticateToken(req, res, next);

    // Assert — decoded.id undefined → req.userId = null
    expect(req.userId).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});
