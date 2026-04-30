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

  // ── getAllProducts() ──────────────────────────────────────────────────────
  describe("getAllProducts()", () => {
    // TC_PROD_13
    test("TC_PROD_13 — should_return_all_products_with_variants_for_admin", async () => {
      // Arrange — mock findAllWithVariants trả về danh sách sản phẩm kèm variants
      const mockProducts = [
        { id: 1, name: "Táo đỏ", price: 50000, variants: [{ name: "1kg", stock: 100 }] },
        { id: 2, name: "Cam vàng", price: 30000, variants: [{ name: "500g", stock: 50 }] },
      ];
      productModel.findAllWithVariants.mockResolvedValue(mockProducts);

      // Act
      const result = await ProductService.getAllProducts();

      // Assert — trả về array có ít nhất 1 sản phẩm, mỗi sản phẩm có trường variants
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toEqual(mockProducts);
      expect(result[0]).toHaveProperty("variants");

      // CheckDB — findAllWithVariants được gọi đúng 1 lần, không có tham số
      expect(productModel.findAllWithVariants).toHaveBeenCalledTimes(1);

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });
  });
  // ── end getAllProducts() ──────────────────────────────────────────────────

  // ── getAllActiveProducts() ────────────────────────────────────────────────
  describe("getAllActiveProducts()", () => {
    // TC_PROD_14
    test("TC_PROD_14 — should_return_active_products_for_homepage", async () => {
      // Arrange — mock findAllActive trả về array sản phẩm có status active
      const mockActiveProducts = [
        { id: 1, name: "Táo đỏ", price: 50000, status: "active" },
        { id: 3, name: "Nho đen", price: 80000, status: "active" },
      ];
      productModel.findAllActive.mockResolvedValue(mockActiveProducts);

      // Act
      const result = await ProductService.getAllActiveProducts();

      // Assert — trả về array sản phẩm active
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toEqual(mockActiveProducts);

      // CheckDB — findAllActive được gọi đúng 1 lần
      expect(productModel.findAllActive).toHaveBeenCalledTimes(1);

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });

    // TC_PROD_15
    test("TC_PROD_15 — should_return_empty_array_when_no_active_products_exist", async () => {
      // Arrange — mock findAllActive trả về array rỗng
      productModel.findAllActive.mockResolvedValue([]);

      // Act
      const result = await ProductService.getAllActiveProducts();

      // Assert — kết quả phải là [] (array rỗng)
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);

      // CheckDB — findAllActive vẫn được gọi đúng 1 lần
      expect(productModel.findAllActive).toHaveBeenCalledTimes(1);

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });
  });
  // ── end getAllActiveProducts() ────────────────────────────────────────────

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

  // ── getProductsByCategory() ───────────────────────────────────────────────
  describe("getProductsByCategory()", () => {
    // TC_PROD_16
    test("TC_PROD_16 — should_return_products_when_categoryId_is_valid", async () => {
      // Arrange — mock findByCategory trả về array sản phẩm thuộc category
      const mockProducts = [
        { id: 1, name: "Táo đỏ", price: 50000, category_id: 1 },
        { id: 2, name: "Cam vàng", price: 30000, category_id: 1 },
      ];
      productModel.findByCategory.mockResolvedValue(mockProducts);

      // Act
      const result = await ProductService.getProductsByCategory(1);

      // Assert — trả về array có ít nhất 1 sản phẩm
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toEqual(mockProducts);

      // CheckDB — findByCategory được gọi đúng 1 lần với đúng categoryId
      expect(productModel.findByCategory).toHaveBeenCalledTimes(1);
      expect(productModel.findByCategory).toHaveBeenCalledWith(1);

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });

    // TC_PROD_17
    test("TC_PROD_17 — should_return_empty_array_when_category_has_no_products", async () => {
      // Arrange — mock findByCategory trả về [] (không có sản phẩm nào thuộc category này)
      productModel.findByCategory.mockResolvedValue([]);

      // Act
      const result = await ProductService.getProductsByCategory(9999);

      // Assert — kết quả phải là [] (array rỗng)
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);

      // CheckDB — findByCategory vẫn được gọi đúng 1 lần với đúng categoryId
      expect(productModel.findByCategory).toHaveBeenCalledTimes(1);
      expect(productModel.findByCategory).toHaveBeenCalledWith(9999);

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });
  });
  // ── end getProductsByCategory() ───────────────────────────────────────────

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

  // ── getProductById() ──────────────────────────────────────────────────────
  describe("getProductById()", () => {
    // TC_PROD_18
    test("TC_PROD_18 — should_return_product_without_variants_when_id_exists", async () => {
      // Arrange — mock findById trả về product object không có variants
      const mockProduct = { id: 1, name: "Táo đỏ", price: 50000, category_id: 1 };
      productModel.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await ProductService.getProductById(1);

      // Assert — trả về product có id=1, không có trường variants
      expect(result).toEqual(mockProduct);
      expect(result).toHaveProperty("id", 1);
      expect(result).not.toHaveProperty("variants");

      // CheckDB — findById được gọi đúng 1 lần với đúng id
      expect(productModel.findById).toHaveBeenCalledTimes(1);
      expect(productModel.findById).toHaveBeenCalledWith(1);

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });

    // TC_PROD_19
    test("TC_PROD_19 — should_return_null_when_product_id_does_not_exist", async () => {
      // Arrange — mock findById trả về null
      productModel.findById.mockResolvedValue(null);

      // Act
      const result = await ProductService.getProductById(9999);

      // Assert — kết quả phải là null
      expect(result).toBeNull();

      // CheckDB — findById được gọi đúng 1 lần với đúng id
      expect(productModel.findById).toHaveBeenCalledTimes(1);
      expect(productModel.findById).toHaveBeenCalledWith(9999);

      // Rollback: dùng mock => không có dữ liệu thật nào được tạo => không cần rollback
    });
  });
  // ── end getProductById() ──────────────────────────────────────────────────

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

  // ── deleteVariant() ───────────────────────────────────────────────────────
  describe("deleteVariant()", () => {
    // TC_PROD_20
    test("TC_PROD_20 — should_delete_variant_successfully_when_variantId_exists", async () => {
      // Arrange — mock deleteVariantById trả về kết quả xóa thành công
      const mockDeleteResult = { affectedRows: 1 };
      productModel.deleteVariantById.mockResolvedValue(mockDeleteResult);

      // Act
      const result = await ProductService.deleteVariant(5);

      // Assert — trả về {affectedRows: 1}
      expect(result).toEqual(mockDeleteResult);
      expect(result).toHaveProperty("affectedRows", 1);

      // CheckDB — deleteVariantById được gọi đúng 1 lần với đúng variantId
      expect(productModel.deleteVariantById).toHaveBeenCalledTimes(1);
      expect(productModel.deleteVariantById).toHaveBeenCalledWith(5);

      // Rollback: dùng mock => không có dữ liệu thật nào bị xóa => không cần rollback
    });

    // TC_PROD_21
    test("TC_PROD_21 — should_return_affectedRows_zero_when_variantId_does_not_exist", async () => {
      // Arrange — mock deleteVariantById trả về affectedRows=0 (variantId không tồn tại)
      const mockDeleteResult = { affectedRows: 0 };
      productModel.deleteVariantById.mockResolvedValue(mockDeleteResult);

      // Act
      const result = await ProductService.deleteVariant(9999);

      // Assert — affectedRows phải là 0
      expect(result).toEqual(mockDeleteResult);
      expect(result).toHaveProperty("affectedRows", 0);

      // CheckDB — deleteVariantById vẫn được gọi đúng 1 lần với đúng variantId
      expect(productModel.deleteVariantById).toHaveBeenCalledTimes(1);
      expect(productModel.deleteVariantById).toHaveBeenCalledWith(9999);

      // Rollback: dùng mock => không có dữ liệu thật nào bị xóa => không cần rollback
    });

    // TC_PROD_22
    test("TC_PROD_22 — should_throw_error_when_deleteVariantById_fails", async () => {
      // Arrange — mock deleteVariantById ném lỗi (DB error)
      productModel.deleteVariantById.mockRejectedValue(
        new Error("Database error")
      );

      // Act & Assert
      await expect(ProductService.deleteVariant(1)).rejects.toThrow(
        "Database error"
      );

      // CheckDB — deleteVariantById vẫn được gọi đúng 1 lần với đúng variantId
      expect(productModel.deleteVariantById).toHaveBeenCalledTimes(1);
      expect(productModel.deleteVariantById).toHaveBeenCalledWith(1);

      // Rollback: dùng mock => không có dữ liệu thật nào bị xóa => không cần rollback
    });
  });
  // ── end deleteVariant() ───────────────────────────────────────────────────
});
// ════════════════════════════════════════════════════════════════════════════