# Test Plan: Medusa QA Automation

## 1. Mục tiêu và phạm vi
- Mục tiêu: ...
- Trong phạm vi: storefront (account, sản phẩm, giỏ hàng, thanh toán), admin (sản phẩm, đơn hàng), Store/Admin API, hiệu năng bằng K6
- Ngoài phạm vi: ...

## 2. Môi trường
- Môi trường: `local`, `ci` (chọn bằng biến `TEST_ENV`, file `.env.<tên>`)
- URL: storefront ..., admin ..., API ...
- Phiên bản: Medusa ..., Node ..., Playwright ..., K6 ..., Docker ...

## 3. Chiến lược dữ liệu
- Không reset DB giữa các lần chạy
- Test tự tạo dữ liệu riêng (email duy nhất, đơn riêng)
- So sánh thay đổi trước và sau, không so với số cố định (ví dụ tồn kho)
- Không sửa dữ liệu seed dùng chung
- Test đối chiếu DB lấy kết quả UI/API và DB cùng lúc rồi so với nhau
- Customer test cố định do project `setup` tạo

## 4. Xác thực
- UI: `storageState` cho admin và customer (project `setup`)
- Store API: header publishable key; Admin API: token qua endpoint auth

## 5. Cấu trúc thư mục và quy ước
- Cây thư mục: ...
- ID test case: `UI-ACCOUNT-01`, `API-CART-01`...
- Tag: `@smoke`, `@regression`, `@ui`, `@api`, `@e2e`
- Nhánh: ...; commit: ...

## 6. Chiến lược theo loại test
| Loại | Số lượng mục tiêu | Ghi chú |
|---|---|---|
| UI | ~25 | ... |
| API | ~20 | ... |
| E2E | 4-5 | ... |
| Perf (K6) | 3-4 | ... |

## 7. Định nghĩa @smoke
- ...

## 8. Rủi ro và giả định
- Dữ liệu tích luỹ trong DB local
- Không chạy K6 cùng lúc Playwright
- Phụ thuộc phiên bản Medusa (đối chiếu API với tài liệu đúng bản)
- ...