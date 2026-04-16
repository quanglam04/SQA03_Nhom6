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
    test("TC_PROD_01 — should return new product object when created with valid data", async () => {
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
    });
  });
  // ── end createProduct() ───────────────────────────────────────────────────

  // ── getProductDetail() ────────────────────────────────────────────────────
  describe("getProductDetail()", () => {
    // TC_PROD_02
    test("TC_PROD_02 — should return product with variants when product exists", async () => {
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
  });
  // ── end getProductDetail() ────────────────────────────────────────────────

  // ── searchProductByName() ─────────────────────────────────────────────────
  describe("searchProductByName()", () => {
    // TC_PROD_03
    test("TC_PROD_03 — should return array with products when keyword matches", async () => {
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
    test("TC_PROD_04 — should return empty array when no product matches keyword", async () => {
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

  // ── deleteProduct() ───────────────────────────────────────────────────────
  describe("deleteProduct()", () => {
    // TC_PROD_05
    test("TC_PROD_05 — should call removeWithVariants and return result when deleting product", async () => {
      // Arrange — mock trả về kết quả xóa thành công
      const mockDeleteResult = { affectedRows: 1 };
      productModel.removeWithVariants.mockResolvedValue(mockDeleteResult);

      // Act
      const result = await ProductService.deleteProduct(1);

      // Assert — removeWithVariants được gọi với id=1; trả về kết quả xóa
      expect(result).toEqual(mockDeleteResult);

      // CheckDB — xác minh removeWithVariants được gọi đúng 1 lần với đúng id
      expect(productModel.removeWithVariants).toHaveBeenCalledTimes(1);
      expect(productModel.removeWithVariants).toHaveBeenCalledWith(1);
    });
  });
  // ── end deleteProduct() ───────────────────────────────────────────────────
});
// ════════════════════════════════════════════════════════════════════════════