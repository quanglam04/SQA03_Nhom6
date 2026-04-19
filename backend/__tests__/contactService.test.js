/**
 * Unit Test — contactService
 * File gốc  : backend/services/contactService.js
 * Test file : backend/__tests__/contactService.test.js
 * Người PT  : Trịnh Quang Lâm
 *
 * Rollback  : Toàn bộ test dùng jest.mock() để mock contactModel,
 *             không kết nối DB thật => không có dữ liệu nào được
 *             tạo / thay đổi => KHÔNG cần rollback sau khi chạy test.
 */

// ── Mock toàn bộ contactModel — không dùng DB thật ──────────────────────────
jest.mock("../models/contactModel");

const contactModel = require("../models/contactModel");
const contactService = require("../services/contactService");

// ════════════════════════════════════════════════════════════════════════════
describe("contactService", () => {
  // Reset tất cả mock trước mỗi test để tránh ảnh hưởng lẫn nhau
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── updateStatus() ─────────────────────────────────────────────────────────
  describe("updateStatus()", () => {
    // TC_CONT_01
    test("TC_CONT_01 — should return success:false when status is invalid", async () => {
      // Arrange — không cần mock model vì validation chặn trước khi gọi DB

      // Act
      const result = await contactService.updateStatus(1, "invalid_status");

      // Assert — trả về lỗi validation
      expect(result).toEqual({
        success: false,
        message: "Status không hợp lệ",
      });

      // CheckDB — contactModel.updateStatus KHÔNG được gọi vì bị chặn bởi validation
      expect(contactModel.updateStatus).not.toHaveBeenCalled();
    });

    // TC_CONT_02
    test("TC_CONT_02 — should return success:true when status is valid and record exists", async () => {
      // Arrange — mock trả về affectedRows=1 (cập nhật thành công)
      contactModel.updateStatus.mockResolvedValue({ affectedRows: 1 });

      // Act
      const result = await contactService.updateStatus(1, "resolved");

      // Assert — trả về thành công
      expect(result).toEqual({
        success: true,
        message: "Cập nhật thành công",
      });

      // CheckDB — xác minh updateStatus được gọi đúng 1 lần với đúng tham số
      expect(contactModel.updateStatus).toHaveBeenCalledTimes(1);
      expect(contactModel.updateStatus).toHaveBeenCalledWith(1, "resolved");
    });

    // TC_CONT_03
    test("TC_CONT_03 — should return success:false when id does not exist (affectedRows=0)", async () => {
      // Arrange — mock trả về affectedRows=0 (không tìm thấy record)
      contactModel.updateStatus.mockResolvedValue({ affectedRows: 0 });

      // Act
      const result = await contactService.updateStatus(9999, "pending");

      // Assert — trả về không tìm thấy
      expect(result).toEqual({
        success: false,
        message: "Không tìm thấy",
      });

      // CheckDB — xác minh updateStatus vẫn được gọi với đúng tham số
      expect(contactModel.updateStatus).toHaveBeenCalledTimes(1);
      expect(contactModel.updateStatus).toHaveBeenCalledWith(9999, "pending");
    });
  });
  // ── end updateStatus() ─────────────────────────────────────────────────────

  // ── getRequestById() ───────────────────────────────────────────────────────
  describe("getRequestById()", () => {
    // TC_CONT_04
    test("TC_CONT_04 — should return success:true with data when id exists", async () => {
      // Arrange — mock trả về array có 1 phần tử (tìm thấy record)
      const mockContact = {
        id: 1,
        name: "Nguyen Van A",
        email: "a@test.com",
        status: "pending",
      };
      contactModel.getById.mockResolvedValue([mockContact]);

      // Act
      const result = await contactService.getRequestById(1);

      // Assert — trả về đúng object trong data
      expect(result).toEqual({
        success: true,
        data: mockContact,
      });
      expect(result.data).toHaveProperty("id", 1);

      // CheckDB — xác minh getById được gọi đúng 1 lần với đúng tham số
      expect(contactModel.getById).toHaveBeenCalledTimes(1);
      expect(contactModel.getById).toHaveBeenCalledWith(1);
    });

    // TC_CONT_05
    test("TC_CONT_05 — should return success:false when id does not exist", async () => {
      // Arrange — mock trả về array rỗng (không tìm thấy record)
      contactModel.getById.mockResolvedValue([]);

      // Act
      const result = await contactService.getRequestById(9999);

      // Assert — trả về không tìm thấy
      expect(result).toEqual({
        success: false,
        message: "Không tìm thấy",
      });

      // CheckDB — xác minh getById vẫn được gọi với đúng tham số
      expect(contactModel.getById).toHaveBeenCalledTimes(1);
      expect(contactModel.getById).toHaveBeenCalledWith(9999);
    });
  });
  // ── end getRequestById() ───────────────────────────────────────────────────
});
// ════════════════════════════════════════════════════════════════════════════
