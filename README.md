# Đồ án tốt nghiệp D21 - Tài liệu test nhóm 6

## Yêu cầu cấu hình

- NodeJS (20+)
- Docker Engine (27+)
- Docker Compose (2+)

## Cách chạy

### 1. Chạy Frontend

```bash
cd ./frontend
```

Tải thư viện nếu chưa có

```bash
npm install
```

```javascript
npm run dev
```

### 2. Chạy Backend

```bash
cd ./backend
```

Tải thư viện nếu chưa có

```bash
npm install
```

```javascript
npm run dev
```

### 3. Khởi tạo ChromaDB

- Khởi động Docker Desktop
- Sau đó chạy lần lượt:

```bash
cd ./backend/rag
```

```bash
docker compose up
```

### 4. Sinh dữ liệu và chuẩn hóa (chỉ cần chạy 1 lần thôi do trong Code nó đã xử lý rồi)

```bash
cd ./backend/rag/scripts
```

```javascript
node prepareRAGData.js
```

### 5. Đưa dữ liệu vào Vector Database (ChoromaDB) (tương tự cái trên chỉ cần chạy 1 lần. Tất cả những lần thêm sửa xóa sau nó đã xử lý trong code)

```bash
cd ./backend/rag/scripts
```

```javascript
node indexRAGDocs.js
```
