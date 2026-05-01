module.exports = {
  baseUrl: 'http://localhost:5173',
  timeout: 10000,
  browser: 'chrome',
  delayBetweenSteps: 1500, // Thời gian nghỉ giữa các bước (ms)
  
  // Cấu hình Database để kiểm tra dữ liệu và rollback
  db: {
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'ecommerce_db'
  }
};
