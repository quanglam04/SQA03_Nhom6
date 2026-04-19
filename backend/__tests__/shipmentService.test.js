/**
 * Unit Test — ShipmentService
 * File gốc  : backend/services/shipmentService.js
 * Test file : backend/__tests__/shipmentService.test.js
 * Người PT  : Trịnh Quang Lâm
 *
 * Rollback  : Toàn bộ test dùng jest.mock() để mock ShipmentModel,
 *             không kết nối DB thật => không có dữ liệu nào được
 *             tạo / thay đổi => KHÔNG cần rollback sau khi chạy test.
 */

// ── Mock toàn bộ ShipmentModel — không dùng DB thật ─────────────────────────
jest.mock("../models/shipmentModel");

const ShipmentModel = require("../models/shipmentModel");
const ShipmentService = require("../services/shipmentService");

// ════════════════════════════════════════════════════════════════════════════
describe("ShipmentService", () => {
  // Reset tất cả mock trước mỗi test để tránh ảnh hưởng lẫn nhau
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getShipment() ──────────────────────────────────────────────────────────
  describe("getShipment()", () => {
    // TC_SHIP_01
    test("TC_SHIP_01 — should return shipment object when orderId exists", async () => {
      // Arrange — mock dữ liệu trả về khi tìm thấy shipment
      const mockShipment = {
        order_id: 1,
        status: "shipping",
        tracking_code: "VN123",
      };
      ShipmentModel.findByOrderId.mockResolvedValue(mockShipment);

      // Act — gọi hàm cần test
      const result = await ShipmentService.getShipment(1);

      // Assert — kiểm tra kết quả trả về đúng object
      expect(result).toEqual(mockShipment);
      expect(result).toHaveProperty("order_id", 1);
      expect(result).toHaveProperty("status", "shipping");
      expect(result).toHaveProperty("tracking_code", "VN123");

      // CheckDB — xác minh findByOrderId được gọi đúng 1 lần với đúng tham số
      expect(ShipmentModel.findByOrderId).toHaveBeenCalledTimes(1);
      expect(ShipmentModel.findByOrderId).toHaveBeenCalledWith(1);
    });

    // TC_SHIP_02
    test("TC_SHIP_02 — should return null when orderId does not exist", async () => {
      // Arrange — mock trả về null (không tìm thấy shipment)
      ShipmentModel.findByOrderId.mockResolvedValue(null);

      // Act
      const result = await ShipmentService.getShipment(9999);

      // Assert — kết quả phải là null
      expect(result).toBeNull();

      // CheckDB — xác minh vẫn gọi đúng hàm với đúng tham số
      expect(ShipmentModel.findByOrderId).toHaveBeenCalledTimes(1);
      expect(ShipmentModel.findByOrderId).toHaveBeenCalledWith(9999);
    });
  });
  // ── end getShipment() ──────────────────────────────────────────────────────

  // ── updateShipment() ───────────────────────────────────────────────────────
  describe("updateShipment()", () => {
    // TC_SHIP_03
    test("TC_SHIP_03 — should call create() when shipment does not exist yet", async () => {
      // Arrange — mock findByOrderId trả về null => chưa có shipment
      const newShipment = {
        order_id: 1,
        status: "shipping",
        tracking_code: "VN123",
      };
      ShipmentModel.findByOrderId.mockResolvedValue(null);
      ShipmentModel.create.mockResolvedValue(newShipment);

      const shipmentData = { status: "shipping", tracking_code: "VN123" };

      // Act
      const result = await ShipmentService.updateShipment(1, shipmentData);

      // Assert — kết quả là shipment vừa được tạo
      expect(result).toEqual(newShipment);

      // CheckDB — create() phải được gọi đúng 1 lần với đúng data
      expect(ShipmentModel.create).toHaveBeenCalledTimes(1);
      expect(ShipmentModel.create).toHaveBeenCalledWith({
        order_id: 1,
        ...shipmentData,
      });

      // CheckDB — update() KHÔNG được gọi vì shipment chưa tồn tại
      expect(ShipmentModel.update).not.toHaveBeenCalled();
    });

    // TC_SHIP_04
    test("TC_SHIP_04 — should call update() when shipment already exists", async () => {
      // Arrange — mock findByOrderId trả về object => đã có shipment
      const existingShipment = {
        order_id: 1,
        status: "shipping",
        tracking_code: "VN123",
      };
      const updatedShipment = {
        order_id: 1,
        status: "delivered",
        tracking_code: "VN123",
      };
      ShipmentModel.findByOrderId.mockResolvedValue(existingShipment);
      ShipmentModel.update.mockResolvedValue(updatedShipment);

      const shipmentData = { status: "delivered" };

      // Act
      const result = await ShipmentService.updateShipment(1, shipmentData);

      // Assert — kết quả là shipment sau khi cập nhật
      expect(result).toEqual(updatedShipment);
      expect(result).toHaveProperty("status", "delivered");

      // CheckDB — update() phải được gọi đúng 1 lần với đúng tham số
      expect(ShipmentModel.update).toHaveBeenCalledTimes(1);
      expect(ShipmentModel.update).toHaveBeenCalledWith(1, shipmentData);

      // CheckDB — create() KHÔNG được gọi vì shipment đã tồn tại
      expect(ShipmentModel.create).not.toHaveBeenCalled();
    });
  });
  // ── end updateShipment() ───────────────────────────────────────────────────
});
// ════════════════════════════════════════════════════════════════════════════
