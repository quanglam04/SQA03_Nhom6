/**
 * Unit Test — CartService
 * File gốc  : backend/services/cartService.js
 * Test file : backend/__tests__/cartService.test.js
 * Người PT  : Kiên
 *
 * Rollback  : Toàn bộ test dùng jest.mock() để mock cartModel và productModel,
 *             không kết nối DB thật => không có dữ liệu nào được
 *             tạo / thay đổi => KHÔNG cần rollback sau khi chạy test.
 */

// ── Mock toàn bộ models — không dùng DB thật ────────────────────────────────
jest.mock("../models/index");

// cartService.js có đoạn debug gọi pool.query('SELECT DATABASE()') trực tiếp
// => cần mock thêm config/mysql để tránh kết nối DB thật
// pool.query trả về [[{ db_name: "..." }]] theo cấu trúc MySQL2 destructure
jest.mock("../config/mysql", () => ({
  pool: {
    query: jest.fn().mockResolvedValue([[{ db_name: "test_db" }]]),
  },
}));

const { cartModel, productModel } = require("../models/index");
const CartService = require("../services/cartService");

// ════════════════════════════════════════════════════════════════════════════
describe("CartService", () => {
  // Reset tất cả mock trước mỗi test để tránh ảnh hưởng lẫn nhau
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getOrCreateCart() ──────────────────────────────────────────────────────
  describe("getOrCreateCart()", () => {
    // TC_CART_09
    test("TC_CART_09 — should_return_existing_cart_when_cart_already_exists_for_user", async () => {
      // Arrange — mock cartModel.findByUserId trả về giỏ đã tồn tại
      const mockCart = { id: 42, user_id: 1 };
      cartModel.findByUserId.mockResolvedValue(mockCart);

      // Act — gọi hàm cần test
      const result = await CartService.getOrCreateCart(1);

      // Assert — trả về đúng cart hiện có, KHÔNG tạo mới
      expect(result).toEqual(mockCart);
      expect(result).toHaveProperty("id", 42);

      // CheckDB — findByUserId được gọi đúng 1 lần với đúng tham số
      expect(cartModel.findByUserId).toHaveBeenCalledTimes(1);
      expect(cartModel.findByUserId).toHaveBeenCalledWith(1);

      // CheckDB — create KHÔNG được gọi vì giỏ đã tồn tại
      expect(cartModel.create).not.toHaveBeenCalled();

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });

    // TC_CART_10
    test("TC_CART_10 — should_create_and_return_new_cart_when_no_cart_exists_for_user", async () => {
      // Arrange — mock findByUserId trả về null (chưa có giỏ); create trả về giỏ mới
      const mockNewCart = { id: 99, user_id: 2 };
      cartModel.findByUserId.mockResolvedValue(null);
      cartModel.create.mockResolvedValue(mockNewCart);

      // Act
      const result = await CartService.getOrCreateCart(2);

      // Assert — trả về giỏ vừa được tạo mới
      expect(result).toEqual(mockNewCart);
      expect(result).toHaveProperty("id", 99);

      // CheckDB — create được gọi đúng 1 lần với đúng userId
      expect(cartModel.create).toHaveBeenCalledTimes(1);
      expect(cartModel.create).toHaveBeenCalledWith(2);

      // CheckDB — findByUserId vẫn được gọi trước để kiểm tra
      expect(cartModel.findByUserId).toHaveBeenCalledTimes(1);
      expect(cartModel.findByUserId).toHaveBeenCalledWith(2);

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });
  });
  // ── end getOrCreateCart() ──────────────────────────────────────────────────

  // ── addItem() ──────────────────────────────────────────────────────────────
  describe("addItem()", () => {
    // TC_CART_01
    test("TC_CART_01 — should_add_new_item_to_cart_when_variant_not_yet_in_cart", async () => {
      // Arrange — mock variant tồn tại, stock đủ; giỏ hàng đã có; chưa có item này
      const mockVariant = { id: 5, stock: 10 };
      const mockCart = { id: 42 };

      productModel.findVariantById.mockResolvedValue(mockVariant);
      cartModel.findByUserId.mockResolvedValue(mockCart);
      cartModel.findItemByCartAndVariant.mockResolvedValue(null);
      cartModel.addItem.mockResolvedValue({ id: 1 });

      // Act — gọi hàm cần test
      const result = await CartService.addItem(1, 5, 2);

      // Assert — trả về đúng cart_id
      expect(result).toEqual({ cart_id: 42 });

      // CheckDB — addItem được gọi đúng tham số
      expect(cartModel.addItem).toHaveBeenCalledTimes(1);
      expect(cartModel.addItem).toHaveBeenCalledWith(42, 5, 2);

      // CheckDB — updateItemQuantity KHÔNG được gọi vì item chưa tồn tại trong giỏ
      expect(cartModel.updateItemQuantity).not.toHaveBeenCalled();

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });

    // TC_CART_02
    test("TC_CART_02 — should_accumulate_quantity_when_variant_already_exists_in_cart", async () => {
      // Arrange — giỏ đã có item variant=5, quantity=3; stock=10; thêm quantity=2
      const mockVariant = { id: 5, stock: 10 };
      const mockCart = { id: 42 };
      const existingItem = { id: 10, quantity: 3 };

      productModel.findVariantById.mockResolvedValue(mockVariant);
      cartModel.findByUserId.mockResolvedValue(mockCart);
      cartModel.findItemByCartAndVariant.mockResolvedValue(existingItem);
      cartModel.updateItemQuantity.mockResolvedValue(true);

      // Act
      const result = await CartService.addItem(1, 5, 2);

      // Assert
      expect(result).toEqual({ cart_id: 42 });

      // CheckDB — updateItemQuantity được gọi với quantity = 3 + 2 = 5
      expect(cartModel.updateItemQuantity).toHaveBeenCalledTimes(1);
      expect(cartModel.updateItemQuantity).toHaveBeenCalledWith(10, 5);

      // CheckDB — addItem KHÔNG được gọi vì item đã tồn tại trong giỏ
      expect(cartModel.addItem).not.toHaveBeenCalled();
    });

    // TC_CART_03
    test("TC_CART_03 — should_throw_error_when_stock_is_insufficient", async () => {
      // Arrange — variant chỉ còn stock=1, yêu cầu quantity=5
      const mockVariant = { id: 5, stock: 1 };
      productModel.findVariantById.mockResolvedValue(mockVariant);

      // Act & Assert
      await expect(CartService.addItem(1, 5, 5)).rejects.toThrow(
        "Insufficient stock. Available: 1"
      );

      // CheckDB — không có thay đổi DB nào được thực hiện
      expect(cartModel.addItem).not.toHaveBeenCalled();
      expect(cartModel.updateItemQuantity).not.toHaveBeenCalled();

      // Rollback: dùng mock => không có dữ liệu thật nào bị tạo => không cần rollback
    });

    // TC_CART_04
    test("TC_CART_04 — should_throw_error_when_product_variant_does_not_exist", async () => {
      // Arrange — mock productModel.findVariantById trả về null
      productModel.findVariantById.mockResolvedValue(null);

      // Act & Assert
      await expect(CartService.addItem(1, 9999, 1)).rejects.toThrow(
        "Product variant not found"
      );

      // CheckDB — không gọi bất kỳ thao tác nào trên cartModel
      expect(cartModel.addItem).not.toHaveBeenCalled();
      expect(cartModel.updateItemQuantity).not.toHaveBeenCalled();
    });
  });
  // ── end addItem() ──────────────────────────────────────────────────────────

  // ── updateItem() ───────────────────────────────────────────────────────────
  describe("updateItem()", () => {
    // TC_CART_05
    test("TC_CART_05 — should_update_item_quantity_successfully_when_stock_is_sufficient", async () => {
      // Arrange — cartItem id=1 tồn tại; variant có stock=10; cập nhật quantity=4
      const mockCartItem = { id: 1, product_variant_id: 5 };
      const mockVariant = { id: 5, stock: 10 };

      cartModel.findItemById.mockResolvedValue(mockCartItem);
      productModel.findVariantById.mockResolvedValue(mockVariant);
      cartModel.updateItemQuantity.mockResolvedValue(true);

      // Act
      const result = await CartService.updateItem(1, 4);

      // Assert — trả về true
      expect(result).toBe(true);

      // CheckDB — updateItemQuantity được gọi đúng tham số
      expect(cartModel.updateItemQuantity).toHaveBeenCalledTimes(1);
      expect(cartModel.updateItemQuantity).toHaveBeenCalledWith(1, 4);

      // Rollback: dùng mock => không có dữ liệu thật nào bị thay đổi => không cần rollback
    });

    // TC_CART_06
    test("TC_CART_06 — should_throw_error_when_cartItemId_does_not_exist", async () => {
      // Arrange — mock cartModel.findItemById trả về null
      cartModel.findItemById.mockResolvedValue(null);

      // Act & Assert
      await expect(CartService.updateItem(9999, 2)).rejects.toThrow(
        "Cart item not found"
      );

      // CheckDB — updateItemQuantity KHÔNG được gọi
      expect(cartModel.updateItemQuantity).not.toHaveBeenCalled();
    });
  });
  // ── end updateItem() ───────────────────────────────────────────────────────

  // ── removeItem() ───────────────────────────────────────────────────────────
  describe("removeItem()", () => {
    // TC_CART_07
    test("TC_CART_07 — should_remove_item_from_cart_successfully", async () => {
      // Arrange — cartItem id=1 tồn tại trong DB
      const mockCartItem = { id: 1, product_variant_id: 5 };
      cartModel.findItemById.mockResolvedValue(mockCartItem);
      cartModel.removeItem.mockResolvedValue(true);

      // Act
      const result = await CartService.removeItem(1);

      // Assert — trả về true
      expect(result).toBe(true);

      // CheckDB — removeItem được gọi đúng id
      expect(cartModel.removeItem).toHaveBeenCalledTimes(1);
      expect(cartModel.removeItem).toHaveBeenCalledWith(1);

      // Rollback: dùng mock => không có dữ liệu thật nào bị xóa => không cần rollback
    });

    // TC_CART_08
    test("TC_CART_08 — should_throw_error_when_cartItemId_does_not_exist", async () => {
      // Arrange — mock cartModel.findItemById trả về null
      cartModel.findItemById.mockResolvedValue(null);

      // Act & Assert
      await expect(CartService.removeItem(9999)).rejects.toThrow(
        "Cart item not found"
      );

      // CheckDB — removeItem KHÔNG được gọi
      expect(cartModel.removeItem).not.toHaveBeenCalled();
    });
  });
  // ── end removeItem() ───────────────────────────────────────────────────────

  // ── clearCart() ────────────────────────────────────────────────────────────
  describe("clearCart()", () => {
    // TC_CART_11
    test("TC_CART_11 — should_clear_all_items_from_cart_successfully", async () => {
      // Arrange — mock clearCartItems thực thi thành công
      cartModel.clearCartItems.mockResolvedValue(true);

      // Act
      const result = await CartService.clearCart(42);

      // Assert — trả về true
      expect(result).toBe(true);

      // CheckDB — clearCartItems được gọi đúng 1 lần với đúng cartId
      expect(cartModel.clearCartItems).toHaveBeenCalledTimes(1);
      expect(cartModel.clearCartItems).toHaveBeenCalledWith(42);

      // Rollback: dùng mock => không có dữ liệu thật nào bị xóa => không cần rollback
    });

    // TC_CART_12
    test("TC_CART_12 — should_throw_error_when_clearCartItems_fails", async () => {
      // Arrange — mock clearCartItems ném lỗi (DB error hoặc cartId không hợp lệ)
      cartModel.clearCartItems.mockRejectedValue(new Error("Cart not found"));

      // Act & Assert
      await expect(CartService.clearCart(9999)).rejects.toThrow(
        "Cart not found"
      );

      // CheckDB — clearCartItems vẫn được gọi đúng 1 lần với đúng cartId
      expect(cartModel.clearCartItems).toHaveBeenCalledTimes(1);
      expect(cartModel.clearCartItems).toHaveBeenCalledWith(9999);
    });
  });
  // ── end clearCart() ────────────────────────────────────────────────────────
});
// ════════════════════════════════════════════════════════════════════════════