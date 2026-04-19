/**
 * Unit Test — reviewService
 * File gốc  : backend/services/reviewService.js
 * Test file : backend/__tests__/reviewService.test.js
 * Người PT  : Cao Thị Thu Hương
 *
 * Rollback  : Toàn bộ test dùng jest.mock() để mock reviewModel và pool,
 *             không kết nối DB thật => không có dữ liệu nào được
 *             tạo / thay đổi => KHÔNG cần rollback sau khi chạy test.
 */

const reviewService = require("../services/reviewService");
const reviewModel = require("../models/reviewModel");
const { pool } = require("../config/mysql");

jest.mock("../models/reviewModel");
jest.mock("../config/mysql", () => ({
  pool: { query: jest.fn() },
}));

describe("reviewService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- NHÓM 1: canUserReview() ---
  describe("canUserReview()", () => {
    // TC_REV_01
    test('TC_REV_01 - Trả về true khi user đã có order "delivered" chứa product này', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]);
      const result = await reviewService.canUserReview(1, 1);
      expect(result).toBe(true);
    });

    // TC_REV_02
    test("TC_REV_02 - Trả về false khi user chưa mua sản phẩm này", async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const result = await reviewService.canUserReview(1, 99);
      expect(result).toBe(false);
    });

    // TC_REV_11
    test("TC_REV_11 - Kiểm tra quyền review theo biến thể sản phẩm cụ thể", async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]);
      const result = await reviewService.canUserReview(1, null, 10);
      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("product_variant_id = ?"),
        [1, 10],
      );
    });
  });
  // --- end canUserReview() ---

  // --- NHÓM 2: addOrUpdateReview() ---
  describe("addOrUpdateReview()", () => {
    // TC_REV_03
    test("TC_REV_03 - Tạo review mới thành công khi user đủ điều kiện và chưa có review", async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]);
      reviewModel.findByUserAndProduct.mockResolvedValue(null);
      reviewModel.create.mockResolvedValue({ id: 100 });
      reviewModel.findByProductId.mockResolvedValue([]);
      reviewModel.getStatsByProductId.mockResolvedValue({});

      const result = await reviewService.addOrUpdateReview(
        1,
        1,
        5,
        "Sản phẩm tốt",
      );

      expect(result.ok).toBe(true);
      expect(reviewModel.create).toHaveBeenCalled();
      expect(reviewModel.update).not.toHaveBeenCalled();
    });

    // TC_REV_04
    test("TC_REV_04 - Cập nhật review cũ khi user đã review sản phẩm này trước đó", async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]);
      reviewModel.findByUserAndProduct.mockResolvedValue({ id: 10 });
      reviewModel.update.mockResolvedValue({ id: 10 });
      reviewModel.findByProductId.mockResolvedValue([]);
      reviewModel.getStatsByProductId.mockResolvedValue({});

      const result = await reviewService.addOrUpdateReview(
        1,
        1,
        4,
        "Đã cập nhật",
      );

      expect(result.ok).toBe(true);
      expect(reviewModel.update).toHaveBeenCalledWith(10, expect.any(Object));
    });

    // TC_REV_05
    test("TC_REV_05 - Trả về NOT_ELIGIBLE khi user chưa mua sản phẩm", async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const result = await reviewService.addOrUpdateReview(1, 99, 5, "abc");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("NOT_ELIGIBLE");
    });

    // TC_REV_13
    test("TC_REV_13 - Kiểm tra việc làm sạch (trim) nội dung nhận xét trước khi lưu", async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]);
      reviewModel.findByUserAndProduct.mockResolvedValue(null);
      reviewModel.create.mockResolvedValue({ id: 101 });
      reviewModel.findByProductId.mockResolvedValue([]);
      reviewModel.getStatsByProductId.mockResolvedValue({});

      await reviewService.addOrUpdateReview(1, 1, 5, "  Sản phẩm rất tốt  ");

      expect(reviewModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ comment: "Sản phẩm rất tốt" }),
      );
    });
  });
  // --- end addOrUpdateReview() ---

  // --- NHÓM 3: addOrUpdateReviewFromOrder() ---
  describe("addOrUpdateReviewFromOrder()", () => {
    // TC_REV_06
    test("TC_REV_06 - Lỗi khi đơn hàng không tồn tại hoặc không phải của user", async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const result = await reviewService.addOrUpdateReviewFromOrder(
        1,
        999,
        10,
        5,
        "Fail",
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("NOT_ELIGIBLE");
    });

    // TC_REV_07
    test("TC_REV_07 - Lỗi khi đã quá hạn 30 ngày kể từ lúc giao hàng", async () => {
      pool.query.mockResolvedValueOnce([
        [{ product_id: 1, days_since_delivery: 35 }],
      ]);
      const result = await reviewService.addOrUpdateReviewFromOrder(
        1,
        1,
        10,
        5,
        "Late",
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("WINDOW_EXPIRED");
    });

    // TC_REV_08
    test("TC_REV_08 - Thành công khi mọi điều kiện hợp lệ", async () => {
      pool.query.mockResolvedValueOnce([
        [{ product_id: 1, days_since_delivery: 10 }],
      ]);
      reviewModel.findByUserAndProduct.mockResolvedValue(null);
      reviewModel.create.mockResolvedValue({ id: 200 });
      reviewModel.findByProductId.mockResolvedValue([]);
      reviewModel.getStatsByProductId.mockResolvedValue({});

      const result = await reviewService.addOrUpdateReviewFromOrder(
        1,
        1,
        10,
        5,
        "Good",
      );
      expect(result.ok).toBe(true);
      expect(reviewModel.create).toHaveBeenCalled();
    });

    // TC_REV_12
    test("TC_REV_12 - Cập nhật đánh giá cũ khi người dùng thực hiện review từ trang chi tiết đơn hàng", async () => {
      pool.query.mockResolvedValueOnce([
        [{ product_id: 1, days_since_delivery: 5 }],
      ]);
      reviewModel.findByUserAndProduct.mockResolvedValue({ id: 50 });
      reviewModel.update.mockResolvedValue({ id: 50 });
      reviewModel.findByProductId.mockResolvedValue([]);
      reviewModel.getStatsByProductId.mockResolvedValue({});

      await reviewService.addOrUpdateReviewFromOrder(1, 5, 10, 5, "Update");
      expect(reviewModel.update).toHaveBeenCalled();
    });

    // TC_REV_14
    test('TC_REV_14 - Chặn đánh giá nếu đơn hàng tồn tại nhưng chưa chuyển sang trạng thái "delivered"', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const result = await reviewService.addOrUpdateReviewFromOrder(
        1,
        6,
        10,
        5,
        "Not delivered",
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("NOT_ELIGIBLE");
    });
  });
  // --- end addOrUpdateReviewFromOrder() ---

  // --- NHÓM 4: getOrderReviewStatus() ---
  describe("getOrderReviewStatus()", () => {
    // TC_REV_09
    test("TC_REV_09 - Lấy trạng thái review của một đơn hàng thành công", async () => {
      pool.query.mockResolvedValueOnce([
        [{ status: "delivered", days_since_delivery: 10 }],
      ]);
      pool.query.mockResolvedValueOnce([
        [{ variant_id: 10, product_id: 1, reviewed: 0 }],
      ]);

      const result = await reviewService.getOrderReviewStatus(1, 1);

      expect(result.found).toBe(true);
      expect(result.days_remaining).toBe(20);
      expect(result.window_open).toBe(true);
      expect(result.items).toHaveLength(1);
    });

    // TC_REV_10
    test("TC_REV_10 - Trả về found:false khi không tìm thấy đơn hàng", async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const result = await reviewService.getOrderReviewStatus(1, 999);
      expect(result.found).toBe(false);
    });
  });
  // --- end getOrderReviewStatus() ---
});
