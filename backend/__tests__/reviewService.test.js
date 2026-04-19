const reviewService = require('../services/reviewService');
const reviewModel = require('../models/reviewModel');
const { pool } = require('../config/mysql');

// Mock các dependencies
jest.mock('../models/reviewModel');
jest.mock('../config/mysql', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('reviewService - Comprehensive Test Suite (TC_REV_01 to TC_REV_16)', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- NHÓM 1: canUserReview() ---
  describe('canUserReview()', () => {
    test('TC_REV_01 - Trả về true khi user đã có order "delivered" chứa product này', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]); // Mock cho query productId
      const result = await reviewService.canUserReview(1, 1);
      expect(result).toBe(true);
    });

    test('TC_REV_02 - Trả về false khi user chưa mua sản phẩm này', async () => {
      pool.query.mockResolvedValueOnce([[]]); // Mảng rỗng
      const result = await reviewService.canUserReview(1, 99);
      expect(result).toBe(false);
    });

    test('TC_REV_11 - Kiểm tra quyền review theo biến thể sản phẩm cụ thể (variantId)', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]); // Trả về data cho variantId check
      const result = await reviewService.canUserReview(1, null, 10);
      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('product_variant_id = ?'), [1, 10]);
    });
  });

  // --- NHÓM 2: addOrUpdateReview() ---
  describe('addOrUpdateReview()', () => {
    test('TC_REV_03 - Tạo review mới thành công khi user đủ điều kiện và chưa có review', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]); // Eligible = true
      reviewModel.findByUserAndProduct.mockResolvedValue(null); // Chưa có review
      reviewModel.create.mockResolvedValue({ id: 100 });
      reviewModel.findByProductId.mockResolvedValue([]);
      reviewModel.getStatsByProductId.mockResolvedValue({});

      const result = await reviewService.addOrUpdateReview(1, 1, 5, "Sản phẩm tốt");

      expect(result.ok).toBe(true);
      expect(reviewModel.create).toHaveBeenCalled();
      expect(reviewModel.update).not.toHaveBeenCalled();
    });

    test('TC_REV_04 - Cập nhật review cũ khi user đã review sản phẩm này trước đó', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]); 
      reviewModel.findByUserAndProduct.mockResolvedValue({ id: 10 }); // Đã có review ID 10
      reviewModel.update.mockResolvedValue({ id: 10 });

      const result = await reviewService.addOrUpdateReview(1, 1, 4, "Đã cập nhật");

      expect(result.ok).toBe(true);
      expect(reviewModel.update).toHaveBeenCalledWith(10, expect.any(Object));
    });

    test('TC_REV_05 - Trả về NOT_ELIGIBLE khi user chưa mua sản phẩm', async () => {
      pool.query.mockResolvedValueOnce([[]]); // canUserReview -> false
      const result = await reviewService.addOrUpdateReview(1, 99, 5, "abc");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("NOT_ELIGIBLE");
    });

    test('TC_REV_13 - Kiểm tra việc làm sạch (trim) nội dung nhận xét trước khi lưu', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]);
      reviewModel.findByUserAndProduct.mockResolvedValue(null);
      
      await reviewService.addOrUpdateReview(1, 1, 5, "  Sản phẩm rất tốt  ");

      expect(reviewModel.create).toHaveBeenCalledWith(expect.objectContaining({
        comment: "Sản phẩm rất tốt" // Đã bị trim
      }));
    });
  });

  // --- NHÓM 3: addOrUpdateReviewFromOrder() ---
  describe('addOrUpdateReviewFromOrder()', () => {
    test('TC_REV_06 - Lỗi khi đơn hàng không tồn tại hoặc không phải của user', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const result = await reviewService.addOrUpdateReviewFromOrder(1, 999, 10, 5, "Fail");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('NOT_ELIGIBLE');
    });

    test('TC_REV_07 - Lỗi khi đã quá hạn 30 ngày kể từ lúc giao hàng', async () => {
      pool.query.mockResolvedValueOnce([[{ product_id: 1, days_since_delivery: 35 }]]);
      const result = await reviewService.addOrUpdateReviewFromOrder(1, 1, 10, 5, "Late");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('WINDOW_EXPIRED');
    });

    test('TC_REV_08 - Thành công khi mọi điều kiện hợp lệ', async () => {
      pool.query.mockResolvedValueOnce([[{ product_id: 1, days_since_delivery: 10 }]]);
      reviewModel.findByUserAndProduct.mockResolvedValue(null);

      const result = await reviewService.addOrUpdateReviewFromOrder(1, 1, 10, 5, "Good");
      expect(result.ok).toBe(true);
      expect(reviewModel.create).toHaveBeenCalled();
    });

    test('TC_REV_12 - Cập nhật đánh giá cũ khi thực hiện review từ đơn hàng', async () => {
      pool.query.mockResolvedValueOnce([[{ product_id: 1, days_since_delivery: 5 }]]);
      reviewModel.findByUserAndProduct.mockResolvedValue({ id: 50 }); // Đã có review

      await reviewService.addOrUpdateReviewFromOrder(1, 5, 10, 5, "Update");
      expect(reviewModel.update).toHaveBeenCalled();
    });

    test('TC_REV_1 - Chặn đánh giá nếu đơn hàng chưa chuyển sang "delivered"', async () => {
      pool.query.mockResolvedValueOnce([[]]); // Giả lập query tìm status='delivered' không ra data
      const result = await reviewService.addOrUpdateReviewFromOrder(1, 6, 10, 5, "Not delivered");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('NOT_ELIGIBLE');
    });
  });

  // --- NHÓM 4: getOrderReviewStatus() ---
  describe('getOrderReviewStatus()', () => {
    test('TC_REV_09 - Lấy trạng thái review và check logic tính ngày còn lại', async () => {
      // Mock query 1: Order info
      pool.query.mockResolvedValueOnce([[{ 
        status: 'delivered', 
        days_since_delivery: 10 
      }]]);
      // Mock query 2: Items list
      pool.query.mockResolvedValueOnce([[{ variant_id: 10, product_id: 1, reviewed: 0 }]]);

      const result = await reviewService.getOrderReviewStatus(1, 1);

      expect(result.found).toBe(true);
      expect(result.days_remaining).toBe(20); // 30 - 10 = 20
      expect(result.window_open).toBe(true);
      expect(result.items).toHaveLength(1);
    });

    test('TC_REV_10 - Trả về found: false khi không tìm thấy đơn hàng', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const result = await reviewService.getOrderReviewStatus(1, 999);
      expect(result.found).toBe(false);
    });
  });
});