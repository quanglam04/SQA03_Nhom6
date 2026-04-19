/**
 * Unit Tests for authService.js
 * File gốc  : backend/services/authService.js
 * Test file : backend/__tests__/authService.test.js
 * Người PT  : Vũ Nhân Kiên
 * Test Cases: TC_AUTH_01 → TC_AUTH_10
 *
 * Rollback: Toàn bộ DB được mock bằng jest.mock() → không có dữ liệu thật
 * nào được ghi/xóa. Không cần rollback sau mỗi test.
 */

const bcrypt = require("bcryptjs");

// ─── Mock dependencies ──────────────────────────────────────────────────────
jest.mock("../config/mysql", () => ({
  pool: { query: jest.fn() },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// ─── Import sau khi mock ─────────────────────────────────────────────────────
const { pool } = require("../config/mysql");
const {
  createUser,
  verifyPassword,
  signToken,
  createResetToken,
  updatePassword,
  verifyResetToken,
} = require("../services/authService");

// ─── Setup ───────────────────────────────────────────────────────────────────
beforeEach(() => jest.clearAllMocks());

// ═════════════════════════════════════════════════════════════════════════════
// createUser()
// ═════════════════════════════════════════════════════════════════════════════
describe("createUser()", () => {
  // TC_AUTH_01
  it("TC_AUTH_01 - should_create_user_successfully_with_valid_data", async () => {
    // Rollback: mock DB → không cần xóa dữ liệu thật

    const hashedPw = "hashed_Pass@123";
    const now = new Date();
    const userId = 42;

    // Call 1: SELECT * FROM users (findUserByEmail) → không tìm thấy
    // Call 2: INSERT INTO users → trả về insertId
    // Call 3: SELECT id FROM roles WHERE name='customer' → có sẵn roleId
    // Call 4: INSERT INTO user_roles
    // Call 5: SELECT FROM users WHERE id (findUserById)
    pool.query
      .mockResolvedValueOnce([[]]) // findUserByEmail → không tồn tại
      .mockResolvedValueOnce([{ insertId: userId }]) // INSERT users
      .mockResolvedValueOnce([[{ id: 5 }]]) // SELECT roles WHERE name='customer'
      .mockResolvedValueOnce([{}]) // INSERT user_roles
      .mockResolvedValueOnce([
        [
          {
            // findUserById
            id: userId,
            name: "Test User",
            email: "test@example.com",
            phone: "0901234567",
            created_at: now,
            updated_at: now,
          },
        ],
      ]);

    bcrypt.hash.mockResolvedValue(hashedPw);

    const result = await createUser({
      name: "Test User",
      email: "test@example.com",
      phone: "0901234567",
      password: "Pass@123",
    });

    // CheckDB: pool.query được gọi đúng 5 lần
    expect(pool.query).toHaveBeenCalledTimes(5);

    // CheckDB: xác minh INSERT users được gọi
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO users"),
      expect.arrayContaining([
        "Test User",
        "test@example.com",
        hashedPw,
        "0901234567",
      ]),
    );

    // CheckDB: xác minh INSERT user_roles được gọi
    expect(pool.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("INSERT INTO user_roles"),
      [userId, 5],
    );

    // Expected Output: object user có id, email, name; không có trường password
    expect(result).toMatchObject({
      id: userId,
      email: "test@example.com",
      name: "Test User",
      phone: "0901234567",
    });
    expect(result.password).toBeUndefined();
  });

  // TC_AUTH_02
  it("TC_AUTH_02 - should_throw_EMAIL_EXISTS_when_email_already_registered", async () => {
    // Mock findUserByEmail → trả về user đã tồn tại
    pool.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          email: "existing@example.com",
          password: "hashedpw",
        },
      ],
    ]);

    // Rollback: không có thay đổi DB; mock → không cần xóa thật
    await expect(
      createUser({ email: "existing@example.com", password: "Pass@123" }),
    ).rejects.toMatchObject({
      message: "Email already in use",
      code: "EMAIL_EXISTS",
    });

    // Chỉ gọi 1 lần (SELECT findUserByEmail), không INSERT gì thêm
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// verifyPassword()
// ═════════════════════════════════════════════════════════════════════════════
describe("verifyPassword()", () => {
  // TC_AUTH_03
  it("TC_AUTH_03 - should_return_user_object_when_email_and_password_are_correct", async () => {
    const mockUser = {
      id: 10,
      email: "user@test.com",
      name: "Test",
      phone: "0911111111",
      password: "hashed_correctPass",
    };

    // Mock pool.query trả về user row
    pool.query.mockResolvedValueOnce([[mockUser]]);
    // Mock bcrypt.compare → true
    bcrypt.compare.mockResolvedValue(true);

    const result = await verifyPassword("user@test.com", "correctPass");

    // Expected Output: trả về { id, email, name, phone }, không có trường password
    expect(result).toEqual({
      id: 10,
      email: "user@test.com",
      name: "Test",
      phone: "0911111111",
    });
    expect(result.password).toBeUndefined();
  });

  // TC_AUTH_04
  it("TC_AUTH_04 - should_return_null_when_password_does_not_match", async () => {
    const mockUser = {
      id: 10,
      email: "user@test.com",
      name: "Test",
      phone: "0911111111",
      password: "hashed_correctPass",
    };

    pool.query.mockResolvedValueOnce([[mockUser]]);
    // Mock bcrypt.compare → false
    bcrypt.compare.mockResolvedValue(false);

    const result = await verifyPassword("user@test.com", "wrongPass");

    expect(result).toBeNull();
  });

  // TC_AUTH_05
  it("TC_AUTH_05 - should_return_null_when_email_does_not_exist", async () => {
    // Mock pool.query trả về rows rỗng
    pool.query.mockResolvedValueOnce([[]]);

    const result = await verifyPassword("notexist@test.com", "anyPass");

    expect(result).toBeNull();
    // bcrypt.compare không được gọi khi user không tồn tại
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// signToken()
// ═════════════════════════════════════════════════════════════════════════════
describe("signToken()", () => {
  // TC_AUTH_06
  it("TC_AUTH_06 - should_return_valid_jwt_string_with_correct_id_payload", () => {
    // Không cần DB / Rollback
    // Dùng jwt thật để kiểm tra token thực sự hợp lệ
    const realJwt = jest.requireActual("jsonwebtoken");
    const secret = process.env.JWT_SECRET || "change_this_secret";

    const token = signToken({ id: 1 });

    // Expected Output: JWT string gồm 3 phần ngăn cách bằng "."
    const parts = token.split(".");
    expect(parts).toHaveLength(3);

    // jwt.verify() không throw error
    expect(() => realJwt.verify(token, secret)).not.toThrow();

    // Payload chứa đúng id = 1
    const decoded = realJwt.verify(token, secret);
    expect(decoded.id).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// createResetToken()
// ═════════════════════════════════════════════════════════════════════════════
describe("createResetToken()", () => {
  // TC_AUTH_07
  it("TC_AUTH_07 - should_create_and_save_reset_token_for_existing_email", async () => {
    const mockUser = { id: 7, email: "user@test.com", name: "User" };

    // findUserByEmail → trả về user
    pool.query
      .mockResolvedValueOnce([[mockUser]]) // SELECT users WHERE email
      .mockResolvedValueOnce([{}]); // INSERT password_resets

    const result = await createResetToken("user@test.com");

    // Expected Output: trả về { token, email }
    expect(result.email).toBe("user@test.com");
    expect(typeof result.token).toBe("string");
    // Token là hex 64 ký tự (crypto.randomBytes(32).toString('hex'))
    expect(result.token).toHaveLength(64);
    expect(result.token).toMatch(/^[a-f0-9]+$/);

    // CheckDB: pool.query INSERT password_resets được gọi
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO password_resets"),
      expect.arrayContaining([mockUser.id]),
    );
  });

  // TC_AUTH_08
  it("TC_AUTH_08 - should_throw_USER_NOT_FOUND_when_email_does_not_exist", async () => {
    // Mock findUserByEmail → null (không có user)
    pool.query.mockResolvedValueOnce([[]]);

    // Rollback: mock DB → không cần xóa thật; không có thay đổi DB nào
    await expect(createResetToken("notfound@test.com")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });

    // Chỉ 1 lần query (SELECT), không INSERT gì
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updatePassword()
// ═════════════════════════════════════════════════════════════════════════════
describe("updatePassword()", () => {
  // TC_AUTH_09
  it("TC_AUTH_09 - should_hash_new_password_and_delete_token_on_success", async () => {
    const resetRecord = {
      user_id: 3,
      token: "validtoken123",
      email: "u@test.com",
    };
    const hashedNewPw = "hashed_NewPass@456";

    // verifyResetToken → SELECT password_resets JOIN users → trả về record hợp lệ
    pool.query
      .mockResolvedValueOnce([[resetRecord]]) // verifyResetToken SELECT
      .mockResolvedValueOnce([{}]) // UPDATE users SET password
      .mockResolvedValueOnce([{}]); // DELETE password_resets WHERE token

    bcrypt.hash.mockResolvedValue(hashedNewPw);

    const result = await updatePassword("validtoken123", "NewPass@456");

    // Expected Output: { success: true }
    expect(result).toEqual({ success: true });

    // CheckDB: UPDATE users được gọi với hashed password
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE users SET password"),
      [hashedNewPw, resetRecord.user_id],
    );

    // CheckDB: DELETE password_resets được gọi với đúng token
    expect(pool.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("DELETE FROM password_resets WHERE token"),
      ["validtoken123"],
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// verifyResetToken()
// ═════════════════════════════════════════════════════════════════════════════
describe("verifyResetToken()", () => {
  // TC_AUTH_10
  it("TC_AUTH_10 - should_throw_INVALID_TOKEN_when_token_expired_or_not_found", async () => {
    // Mock pool.query trả về rows rỗng (token không tồn tại hoặc đã hết hạn)
    pool.query.mockResolvedValueOnce([[]]);

    await expect(
      verifyResetToken("expiredOrInvalidToken"),
    ).rejects.toMatchObject({
      message: "Invalid or expired reset token",
      code: "INVALID_TOKEN",
    });

    // CheckDB: xác minh query được gọi với đúng token
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM password_resets pr"),
      ["expiredOrInvalidToken"],
    );
  });
});
