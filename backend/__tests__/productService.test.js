/**
 * Unit Test — ProductService
 * File gốc  : backend/services/productService.js
 * Test file : backend/__tests__/productService.test.js
 * Người PT  : Kiên
 *
 * Rollback  : Toàn bộ test dùng jest.mock() để mock productModel,
 *             không kết nối DB thật => không có dữ liệu nào được
 *             tạo / thay đổi => KHÔNG cần rollback sau khi chạy test.
 */

// ── Mock toàn bộ productModel — không dùng DB thật ──────────────────────────
jest.mock("../models/productModel");

const productModel = require("../models/productModel");
const ProductService = require("../services/productService");

// ════════════════════════════════════════════════════════════════════════════
describe("ProductService", () => {
  // Reset tất cả mock trước mỗi test để tránh ảnh hưởng lẫn nhau
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createProduct() ───────────────────────────────────────────────────────
  describe("createProduct()", () => {
    // TC_PROD_01
    test("TC_PROD_01 — should_return_new_product_object_when_created_with_valid_data", async () => {
      // Arrange — mock dữ liệu trả về khi tạo sản phẩm thành công
      const inputData = {
        name: "Táo đỏ",
        price: 50000,
        category_id: 1,
        variants: [{ name: "1kg", stock: 100, price_sale: 45000 }],
      };
      const mockProduct = {
        id: 10,
        name: "Táo đỏ",
        price: 50000,
        category_id: 1,
        variants: [{ name: "1kg", stock: 100, price_sale: 45000 }],
      };
      productModel.createWithVariants.mockResolvedValue(mockProduct);

      // Act — gọi hàm cần test
      const result = await ProductService.createProduct(inputData);

      // Assert — kết quả trả về đúng product object có id
      expect(result).toEqual(mockProduct);
      expect(result).toHaveProperty("id");

      // CheckDB — xác minh createWithVariants được gọi đúng 1 lần với đúng data
      expect(productModel.createWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.createWithVariants).toHaveBeenCalledWith(inputData);

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });

    // TC_PROD_06
    test("TC_PROD_06 — should_throw_error_when_createWithVariants_fails", async () => {
      // Arrange — mock createWithVariants ném lỗi (ví dụ: category không tồn tại)
      const inputData = {
        name: "Sản phẩm lỗi",
        price: 10000,
        category_id: 9999,
        variants: [],
      };
      productModel.createWithVariants.mockRejectedValue(
        new Error("Foreign key constraint fails: category_id not found")
      );

      // Act & Assert
      await expect(ProductService.createProduct(inputData)).rejects.toThrow(
        "Foreign key constraint fails: category_id not found"
      );

      // CheckDB — createWithVariants vẫn được gọi đúng 1 lần với đúng data
      expect(productModel.createWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.createWithVariants).toHaveBeenCalledWith(inputData);
    });
  });
  // ── end createProduct() ───────────────────────────────────────────────────

  // ── getProductDetail() ────────────────────────────────────────────────────
  describe("getProductDetail()", () => {
    // TC_PROD_02
    test("TC_PROD_02 — should_return_product_with_variants_when_product_exists", async () => {
      // Arrange — mock dữ liệu trả về khi tìm thấy sản phẩm kèm variants
      const mockProduct = {
        id: 1,
        name: "Táo đỏ",
        price: 50000,
        variants: [
          { name: "500g", stock: 50, price_sale: 25000 },
          { name: "1kg", stock: 100, price_sale: 45000 },
        ],
      };
      productModel.findByIdWithVariants.mockResolvedValue(mockProduct);

      // Act
      const result = await ProductService.getProductDetail(1);

      // Assert — kết quả trả về product object có trường variants là array không rỗng
      expect(result).toEqual(mockProduct);
      expect(result).toHaveProperty("variants");
      expect(Array.isArray(result.variants)).toBe(true);
      expect(result.variants.length).toBeGreaterThan(0);

      // CheckDB — xác minh findByIdWithVariants được gọi đúng 1 lần với đúng tham số
      expect(productModel.findByIdWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.findByIdWithVariants).toHaveBeenCalledWith(1);
    });

    // TC_PROD_07
    test("TC_PROD_07 — should_return_null_when_product_id_does_not_exist", async () => {
      // Arrange — mock findByIdWithVariants trả về null (không tìm thấy sản phẩm)
      productModel.findByIdWithVariants.mockResolvedValue(null);

      // Act
      const result = await ProductService.getProductDetail(9999);

      // Assert — kết quả phải là null
      expect(result).toBeNull();

      // CheckDB — xác minh findByIdWithVariants vẫn được gọi đúng 1 lần với đúng id
      expect(productModel.findByIdWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.findByIdWithVariants).toHaveBeenCalledWith(9999);
    });
  });
  // ── end getProductDetail() ────────────────────────────────────────────────

  // ── searchProductByName() ─────────────────────────────────────────────────
  describe("searchProductByName()", () => {
    // TC_PROD_03
    test("TC_PROD_03 — should_return_array_with_products_when_keyword_matches", async () => {
      // Arrange — mock trả về danh sách có ít nhất 1 sản phẩm khớp từ khóa
      const mockProducts = [
        { id: 1, name: "Táo đỏ", price: 50000 },
        { id: 2, name: "Táo xanh", price: 45000 },
      ];
      productModel.findByName.mockResolvedValue(mockProducts);

      // Act
      const result = await ProductService.searchProductByName("Táo");

      // Assert — kết quả trả về array chứa ít nhất 1 sản phẩm
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toEqual(mockProducts);

      // CheckDB — xác minh findByName được gọi đúng 1 lần với đúng từ khóa
      expect(productModel.findByName).toHaveBeenCalledTimes(1);
      expect(productModel.findByName).toHaveBeenCalledWith("Táo");
    });

    // TC_PROD_04
    test("TC_PROD_04 — should_return_empty_array_when_no_product_matches_keyword", async () => {
      // Arrange — mock trả về array rỗng vì không có sản phẩm khớp
      productModel.findByName.mockResolvedValue([]);

      // Act
      const result = await ProductService.searchProductByName("XYZKhongTonTai");

      // Assert — kết quả phải là [] (array rỗng)
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);

      // CheckDB — xác minh findByName vẫn được gọi đúng 1 lần với đúng từ khóa
      expect(productModel.findByName).toHaveBeenCalledTimes(1);
      expect(productModel.findByName).toHaveBeenCalledWith("XYZKhongTonTai");
    });
  });
  // ── end searchProductByName() ─────────────────────────────────────────────

  // ── updateProduct() ───────────────────────────────────────────────────────
  describe("updateProduct()", () => {
    // TC_PROD_08
    test("TC_PROD_08 — should_return_updated_product_when_update_succeeds_with_valid_data", async () => {
      // Arrange — mock updateWithVariants trả về product đã được cập nhật
      const updateData = {
        name: "Táo đỏ New Zealand",
        price: 60000,
        variants: [{ name: "1kg", stock: 80, price_sale: 55000 }],
      };
      const mockUpdated = {
        id: 1,
        name: "Táo đỏ New Zealand",
        price: 60000,
        variants: [{ name: "1kg", stock: 80, price_sale: 55000 }],
      };
      productModel.updateWithVariants.mockResolvedValue(mockUpdated);

      // Act
      const result = await ProductService.updateProduct(1, updateData);

      // Assert — kết quả trả về product đã được cập nhật đúng
      expect(result).toEqual(mockUpdated);
      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("name", "Táo đỏ New Zealand");

      // CheckDB — updateWithVariants được gọi đúng 1 lần với đúng id và data
      expect(productModel.updateWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.updateWithVariants).toHaveBeenCalledWith(1, updateData);

      // Rollback: dùng mock => không có dữ liệu thật nào bị thay đổi => không cần rollback
    });

    // TC_PROD_09
    test("TC_PROD_09 — should_return_null_when_product_id_does_not_exist", async () => {
      // Arrange — mock updateWithVariants trả về null (id không tồn tại trong DB)
      const updateData = { name: "Sản phẩm không tồn tại", price: 10000 };
      productModel.updateWithVariants.mockResolvedValue(null);

      // Act
      const result = await ProductService.updateProduct(9999, updateData);

      // Assert — kết quả phải là null
      expect(result).toBeNull();

      // CheckDB — updateWithVariants vẫn được gọi đúng 1 lần với đúng id và data
      expect(productModel.updateWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.updateWithVariants).toHaveBeenCalledWith(9999, updateData);
    });

    // TC_PROD_10
    test("TC_PROD_10 — should_throw_error_when_updateWithVariants_fails", async () => {
      // Arrange — mock updateWithVariants ném lỗi (DB error)
      const updateData = { name: "Lỗi DB", price: 10000 };
      productModel.updateWithVariants.mockRejectedValue(
        new Error("Database connection lost")
      );

      // Act & Assert
      await expect(ProductService.updateProduct(1, updateData)).rejects.toThrow(
        "Database connection lost"
      );

      // CheckDB — updateWithVariants vẫn được gọi đúng 1 lần
      expect(productModel.updateWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.updateWithVariants).toHaveBeenCalledWith(1, updateData);
    });
  });
  // ── end updateProduct() ───────────────────────────────────────────────────

  // ── deleteProduct() ───────────────────────────────────────────────────────
  describe("deleteProduct()", () => {
    // TC_PROD_05
    test("TC_PROD_05 — should_call_removeWithVariants_and_return_result_when_product_exists", async () => {
      // Arrange — mock trả về kết quả xóa thành công
      const mockDeleteResult = { affectedRows: 1 };
      productModel.removeWithVariants.mockResolvedValue(mockDeleteResult);

      // Act
      const result = await ProductService.deleteProduct(1);

      // Assert — removeWithVariants được gọi với id=1; trả về kết quả xóa
      expect(result).toEqual(mockDeleteResult);
      expect(result).toHaveProperty("affectedRows", 1);

      // CheckDB — xác minh removeWithVariants được gọi đúng 1 lần với đúng id
      expect(productModel.removeWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.removeWithVariants).toHaveBeenCalledWith(1);

      // Rollback: dùng mock => không có dữ liệu thật nào bị xóa => không cần rollback
    });

    // TC_PROD_11
    test("TC_PROD_11 — should_return_affectedRows_zero_when_product_id_does_not_exist", async () => {
      // Arrange — mock removeWithVariants trả về affectedRows=0 (id không tồn tại)
      const mockDeleteResult = { affectedRows: 0 };
      productModel.removeWithVariants.mockResolvedValue(mockDeleteResult);

      // Act
      const result = await ProductService.deleteProduct(9999);

      // Assert — affectedRows phải là 0, không có bản ghi nào bị xóa
      expect(result).toEqual(mockDeleteResult);
      expect(result).toHaveProperty("affectedRows", 0);

      // CheckDB — removeWithVariants vẫn được gọi đúng 1 lần với đúng id
      expect(productModel.removeWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.removeWithVariants).toHaveBeenCalledWith(9999);
    });

    // TC_PROD_12
    test("TC_PROD_12 — should_throw_error_when_removeWithVariants_fails", async () => {
      // Arrange — mock removeWithVariants ném lỗi (ví dụ: foreign key constraint)
      productModel.removeWithVariants.mockRejectedValue(
        new Error("Cannot delete: product is referenced by existing orders")
      );

      // Act & Assert
      await expect(ProductService.deleteProduct(1)).rejects.toThrow(
        "Cannot delete: product is referenced by existing orders"
      );

      // CheckDB — removeWithVariants vẫn được gọi đúng 1 lần với đúng id
      expect(productModel.removeWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.removeWithVariants).toHaveBeenCalledWith(1);
    });
  });
  // ── end deleteProduct() ───────────────────────────────────────────────────
});
// ════════════════════════════════════════════════════════════════════════════