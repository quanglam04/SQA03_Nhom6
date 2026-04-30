/**
 * Unit Test — userService
 * File gốc  : backend/services/userService.js
 * Test file : backend/__tests__/userService.test.js
 * Người PT  : Vũ Thế Văn
 *
 * Rollback  : Toàn bộ test dùng jest.mock() để mock userModel và bcrypt,
 *             không kết nối DB thật => không có dữ liệu nào được
 *             tạo / thay đổi => KHÔNG cần rollback sau khi chạy test.
 */

jest.mock("../models/userModel");
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const userModel = require("../models/userModel");
const bcrypt = require("bcryptjs");
const userService = require("../services/userService");

describe("userService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("changePassword()", () => {
    test("TC_USER_01 - should_hash_and_save_new_password_when_current_password_is_correct", async () => {
      // Input: id=1, currentPassword="OldPass@1", newPassword="NewPass@1"
      // Expected Output: new password is hashed and saved; updatePassword is called; return update result
      // Mock: user exists, bcrypt.compare=true, bcrypt.hash returns hashed_new_password
      // CheckDB: verify model methods are called with correct parameters
      // Rollback: using Jest mocks only, so no real DB write happens
      userModel.findByIdWithPassword.mockResolvedValue({
        id: 1,
        password: "hashed_old_password",
      });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue("hashed_new_password");
      const mockUpdateResult = { affectedRows: 1 };
      userModel.updatePassword.mockResolvedValue(mockUpdateResult);

      const result = await userService.changePassword(
        1,
        "OldPass@1",
        "NewPass@1",
      );

      expect(userModel.findByIdWithPassword).toHaveBeenCalledWith(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "OldPass@1",
        "hashed_old_password",
      );
      expect(bcrypt.hash).toHaveBeenCalledWith("NewPass@1", expect.any(Number));
      // CheckDB
      expect(userModel.updatePassword).toHaveBeenCalledWith(
        1,
        "hashed_new_password",
      );
      expect(result).toEqual(mockUpdateResult);
    });

    test("TC_USER_02 - should_throw_INCORRECT_PASSWORD_when_current_password_is_wrong", async () => {
      // Input: id=1, currentPassword="WrongPass", newPassword="NewPass@1"
      // Expected Output: throw Error with code="INCORRECT_PASSWORD"
      // Mock: bcrypt.compare=false; no DB update
      // CheckDB: updatePassword must not be called
      // Rollback: using Jest mocks only, so no real DB write happens
      userModel.findByIdWithPassword.mockResolvedValue({
        id: 1,
        password: "hashed_old_password",
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        userService.changePassword(1, "WrongPass", "NewPass@1"),
      ).rejects.toMatchObject({
        message: "Current password is incorrect",
        code: "INCORRECT_PASSWORD",
      });

      expect(userModel.findByIdWithPassword).toHaveBeenCalledWith(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "WrongPass",
        "hashed_old_password",
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userModel.updatePassword).not.toHaveBeenCalled();
    });

    test("TC_USER_03 - should_throw_USER_NOT_FOUND_when_user_does_not_exist", async () => {
      // Input: id=999, currentPassword="any", newPassword="any"
      // Expected Output: throw Error with code="USER_NOT_FOUND"
      // Mock: userModel.findByIdWithPassword returns null
      // CheckDB: bcrypt and updatePassword must not be called
      // Rollback: using Jest mocks only, so no real DB write happens
      userModel.findByIdWithPassword.mockResolvedValue(null);

      await expect(
        userService.changePassword(999, "any", "any"),
      ).rejects.toMatchObject({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });

      expect(userModel.findByIdWithPassword).toHaveBeenCalledWith(999);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userModel.updatePassword).not.toHaveBeenCalled();
    });
  });

  // ── getAllUsers() ──────────────────────────────────────────────────────────
  describe("getAllUsers()", () => {
    test("TC_USER_07 - should_return_list_of_all_users", async () => {
      // Input: không có tham số
      // Expected Output: trả về danh sách users từ model
      // CheckDB: userModel.findAll được gọi đúng 1 lần
      // Rollback: using Jest mocks only, no real DB read
      const mockUsers = [
        { id: 1, name: "Nguyen Van A", email: "a@test.com" },
        { id: 2, name: "Tran Thi B", email: "b@test.com" },
      ];
      userModel.findAll.mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(userModel.findAll).toHaveBeenCalledTimes(1);
    });

    test("TC_USER_08 - should_return_empty_array_when_no_users_exist", async () => {
      // Input: không có tham số
      // Expected Output: trả về mảng rỗng
      // CheckDB: userModel.findAll được gọi đúng 1 lần
      // Rollback: using Jest mocks only, no real DB read
      userModel.findAll.mockResolvedValue([]);

      const result = await userService.getAllUsers();

      expect(result).toEqual([]);
      expect(userModel.findAll).toHaveBeenCalledTimes(1);
    });

    test("TC_USER_09 - should_throw_error_when_model_findAll_fails", async () => {
      // Input: không có tham số
      // Expected Output: throw DB error từ model
      // CheckDB: userModel.findAll được gọi trước khi throw
      // Rollback: using Jest mocks only, no real DB read
      userModel.findAll.mockRejectedValue(new Error("DB connection failed"));

      await expect(userService.getAllUsers()).rejects.toThrow("DB connection failed");
      expect(userModel.findAll).toHaveBeenCalledTimes(1);
    });
  });
  // ── end getAllUsers() ──────────────────────────────────────────────────────

  // ── getUserById() ─────────────────────────────────────────────────────────
  describe("getUserById()", () => {
    test("TC_USER_10 - should_return_user_when_id_exists", async () => {
      // Input: id=1
      // Expected Output: trả về user object từ model
      // CheckDB: userModel.findById được gọi với đúng id
      // Rollback: using Jest mocks only, no real DB read
      const mockUser = { id: 1, name: "Nguyen Van A", email: "a@test.com" };
      userModel.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(userModel.findById).toHaveBeenCalledTimes(1);
      expect(userModel.findById).toHaveBeenCalledWith(1);
    });

    test("TC_USER_11 - should_return_null_when_id_does_not_exist", async () => {
      // Input: id=9999
      // Expected Output: trả về null (không tìm thấy user)
      // CheckDB: userModel.findById được gọi với id=9999
      // Rollback: using Jest mocks only, no real DB read
      userModel.findById.mockResolvedValue(null);

      const result = await userService.getUserById(9999);

      expect(result).toBeNull();
      expect(userModel.findById).toHaveBeenCalledTimes(1);
      expect(userModel.findById).toHaveBeenCalledWith(9999);
    });

    test("TC_USER_12 - should_throw_error_when_model_findById_fails", async () => {
      // Input: id=1
      // Expected Output: throw DB error từ model
      // CheckDB: userModel.findById được gọi trước khi throw
      // Rollback: using Jest mocks only, no real DB read
      userModel.findById.mockRejectedValue(new Error("DB connection failed"));

      await expect(userService.getUserById(1)).rejects.toThrow("DB connection failed");
      expect(userModel.findById).toHaveBeenCalledTimes(1);
      expect(userModel.findById).toHaveBeenCalledWith(1);
    });
  });
  // ── end getUserById() ─────────────────────────────────────────────────────

  describe("updateUser()", () => {
    test("TC_USER_04 - should_return_updated_user_when_id_exists_and_payload_is_valid", async () => {
      // Input: id=3, data={ name: "Van", phone: "0912345678" }
      // Expected Output: return updated user data from model
      // Mock: userModel.updateById resolves updated object
      // CheckDB: updateById must be called with correct id and payload
      // Rollback: using Jest mocks only, so no real DB write happens
      const payload = { name: "Van", phone: "0912345678" };
      const mockResult = { id: 3, ...payload };

      userModel.updateById.mockResolvedValue(mockResult);

      const result = await userService.updateUser(3, payload);

      expect(userModel.updateById).toHaveBeenCalledTimes(1);
      expect(userModel.updateById).toHaveBeenCalledWith(3, payload);
      expect(result).toEqual(mockResult);
    });

    test("TC_USER_05 - should_return_null_when_user_id_does_not_exist", async () => {
      // Input: id=999, data={ name: "Ghost" }
      // Expected Output: return null (no user updated)
      // Mock: userModel.updateById resolves null
      // CheckDB: updateById must be called with id=999
      // Rollback: using Jest mocks only, so no real DB write happens
      const payload = { name: "Ghost" };
      userModel.updateById.mockResolvedValue(null);

      const result = await userService.updateUser(999, payload);

      expect(userModel.updateById).toHaveBeenCalledTimes(1);
      expect(userModel.updateById).toHaveBeenCalledWith(999, payload);
      expect(result).toBeNull();
    });

    test("TC_USER_06 - should_throw_error_when_model_updateById_fails", async () => {
      // Input: id=3, data={ name: "Van" }
      // Expected Output: throw DB error from model
      // Mock: userModel.updateById rejects with error
      // CheckDB: updateById must be called before throwing
      // Rollback: using Jest mocks only, so no real DB write happens
      const payload = { name: "Van" };
      const dbError = new Error("DB update failed");
      userModel.updateById.mockRejectedValue(dbError);

      await expect(userService.updateUser(3, payload)).rejects.toThrow(
        "DB update failed",
      );

      expect(userModel.updateById).toHaveBeenCalledTimes(1);
      expect(userModel.updateById).toHaveBeenCalledWith(3, payload);
    });
  });
});
