/**
 * Unit Test — blogService
 * File gốc  : backend/services/blogService.js
 * Test file : backend/__tests__/blogService.test.js
 * Người PT  : Trịnh Quang Lâm
 *
 * Rollback  : Toàn bộ test dùng jest.mock() để mock blogModel,
 *             không kết nối DB thật => không có dữ liệu nào được
 *             tạo / thay đổi => KHÔNG cần rollback sau khi chạy test.
 */

// ── Mock toàn bộ blogModel — không dùng DB thật ──────────────────────────────
jest.mock("../models/blogModel");

const blogModel = require("../models/blogModel");
const blogService = require("../services/blogService");

// ════════════════════════════════════════════════════════════════════════════
describe("blogService", () => {
  // Reset tất cả mock trước mỗi test để tránh ảnh hưởng lẫn nhau
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createBlog() ───────────────────────────────────────────────────────────
  describe("createBlog()", () => {
    // TC_BLOG_01
    test("TC_BLOG_01 — should return success:true when blogData is valid", async () => {
      // Arrange — mock blogModel.create trả về blog object
      const mockBlog = {
        id: 1,
        title: "Tiêu đề",
        content: "Nội dung bài viết",
        author_id: 1,
      };
      blogModel.create.mockResolvedValue(mockBlog);

      const blogData = {
        title: "Tiêu đề",
        content: "Nội dung bài viết",
        author_id: 1,
      };

      // Act
      const result = await blogService.createBlog(blogData);

      // Assert — trả về thành công kèm data
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBlog);

      // CheckDB — blogModel.create() phải được gọi đúng 1 lần với đúng data
      expect(blogModel.create).toHaveBeenCalledTimes(1);
      expect(blogModel.create).toHaveBeenCalledWith(blogData);
    });

    // TC_BLOG_02
    test("TC_BLOG_02 — should return success:false when title is empty", async () => {
      // Arrange — không cần mock vì validation chặn trước khi gọi DB
      const blogData = { title: "", content: "Nội dung" };

      // Act
      const result = await blogService.createBlog(blogData);

      // Assert — trả về lỗi validation
      expect(result).toEqual({
        success: false,
        message: "Tiêu đề và nội dung bài viết không được trống",
        data: null,
      });

      // CheckDB — blogModel.create() KHÔNG được gọi vì bị chặn bởi validation
      expect(blogModel.create).not.toHaveBeenCalled();
    });
  });
  // ── end createBlog() ───────────────────────────────────────────────────────

  // ── getBlogDetail() ────────────────────────────────────────────────────────
  describe("getBlogDetail()", () => {
    // TC_BLOG_03
    test("TC_BLOG_03 — should return blog with comments when blogId exists", async () => {
      // Arrange — mock blog tồn tại và có 2 comments
      const mockBlog = { id: 1, title: "Tiêu đề", content: "Nội dung" };
      const mockComments = [
        { id: 1, content: "Comment 1", user_id: 1 },
        { id: 2, content: "Comment 2", user_id: 2 },
      ];
      blogModel.findById.mockResolvedValue(mockBlog);
      blogModel.getComments.mockResolvedValue(mockComments);

      // Act
      const result = await blogService.getBlogDetail(1);

      // Assert — trả về blog kèm 2 comments
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        ...mockBlog,
        comments: mockComments,
      });
      expect(result.data.comments).toHaveLength(2);

      // CheckDB — cả findById và getComments đều được gọi đúng tham số
      expect(blogModel.findById).toHaveBeenCalledWith(1);
      expect(blogModel.getComments).toHaveBeenCalledWith(1);
    });

    // TC_BLOG_04
    test("TC_BLOG_04 — should return success:false when blogId does not exist", async () => {
      // Arrange — mock blog không tìm thấy
      blogModel.findById.mockResolvedValue(null);

      // Act
      const result = await blogService.getBlogDetail(9999);

      // Assert — trả về không tìm thấy
      expect(result).toEqual({
        success: false,
        message: "Bài viết không tìm thấy",
        data: null,
      });

      // CheckDB — getComments KHÔNG được gọi vì blog không tồn tại
      expect(blogModel.findById).toHaveBeenCalledWith(9999);
      expect(blogModel.getComments).not.toHaveBeenCalled();
    });
  });
  // ── end getBlogDetail() ────────────────────────────────────────────────────

  // ── searchBlogs() ──────────────────────────────────────────────────────────
  describe("searchBlogs()", () => {
    // TC_BLOG_05
    test("TC_BLOG_05 — should call findAll() when keyword is empty", async () => {
      // Arrange — mock blogModel.findAll trả về danh sách blog
      const mockBlogs = [
        { id: 1, title: "Blog 1" },
        { id: 2, title: "Blog 2" },
      ];
      blogModel.findAll.mockResolvedValue(mockBlogs);

      // Act — truyền keyword rỗng
      const result = await blogService.searchBlogs("");

      // Assert — kết quả tương đương getAllBlogs
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBlogs);

      // CheckDB — findAll() được gọi, searchBlogs() KHÔNG được gọi
      expect(blogModel.findAll).toHaveBeenCalledTimes(1);
      expect(blogModel.searchBlogs).not.toHaveBeenCalled();
    });
  });
  // ── end searchBlogs() ──────────────────────────────────────────────────────

  // ── addComment() ───────────────────────────────────────────────────────────
  describe("addComment()", () => {
    // TC_BLOG_06
    test("TC_BLOG_06 — should return success:false when comment content is empty", async () => {
      // Arrange — không cần mock vì validation chặn trước khi gọi DB

      // Act
      const result = await blogService.addComment(1, 1, "");

      // Assert — trả về lỗi validation
      expect(result).toEqual({
        success: false,
        message: "Nội dung comment không được trống",
        data: null,
      });

      // CheckDB — blogModel.addComment() KHÔNG được gọi vì bị chặn bởi validation
      expect(blogModel.addComment).not.toHaveBeenCalled();
    });
  });
  // ── end addComment() ───────────────────────────────────────────────────────
});
// ════════════════════════════════════════════════════════════════════════════
