# TSMS - Teaching Schedule Management System

TSMS là hệ thống quản lý lịch dạy cấp trường đại học, được xây dựng nhằm số hóa quy trình lập lịch giảng dạy từ dữ liệu nền, phân công giảng viên, kiểm tra xung đột, công bố lịch, tra cứu lịch đến báo cáo khối lượng giảng dạy.

Dự án được định hướng theo tài liệu yêu cầu phần mềm của Phòng Đào tạo - Trường Đại học Công nghệ Miền Bắc, phiên bản 1.0 ngày 26/05/2026.

## Mục Tiêu

- Giảm tối thiểu 60% thời gian xếp lịch mỗi học kỳ so với quy trình thủ công bằng Excel/email.
- Tự động phát hiện xung đột giảng viên, phòng học và lớp/nhóm sinh viên trước khi công bố lịch.
- Tạo một nguồn dữ liệu lịch dạy thống nhất cho Phòng Đào tạo, khoa/bộ môn, giảng viên, sinh viên và lãnh đạo.
- Hỗ trợ giảng viên đăng ký nguyện vọng, khai báo thời gian rảnh/bận và theo dõi lịch cá nhân.
- Tổng hợp khối lượng giảng dạy phục vụ báo cáo, thanh toán giờ giảng và đánh giá.

## Phạm Vi

Trong phạm vi:

- Quản lý dữ liệu nền: khoa/bộ môn, giảng viên, học phần, lớp/nhóm sinh viên, phòng học, khung giờ, học kỳ.
- Quản lý tài khoản, phân quyền theo vai trò.
- Đăng ký nguyện vọng và khả năng giảng dạy.
- Phân công giảng viên và lập lịch dạy.
- Phát hiện xung đột lịch theo giảng viên, phòng, lớp/nhóm sinh viên.
- Quản lý đổi lịch, hủy buổi, dạy bù và mượn phòng.
- Tra cứu lịch, thông báo, báo cáo, thống kê và xuất dữ liệu.
- Audit log cho các thao tác quan trọng.

Ngoài phạm vi giai đoạn đầu:

- Quản lý điểm, học phí, tuyển sinh.
- Quản lý hồ sơ nhân sự đầy đủ.
- Thanh toán giờ giảng tự động.

## Người Dùng Và Vai Trò

- Quản trị hệ thống: cấu hình hệ thống, tài khoản, phân quyền, sao lưu, audit log.
- Phòng Đào tạo: quản lý dữ liệu toàn trường, mở/khóa học kỳ, duyệt và công bố lịch.
- Trưởng khoa/Bộ môn: phân công giảng viên, duyệt nguyện vọng, theo dõi tải giảng dạy.
- Giảng viên: đăng ký nguyện vọng, xem lịch cá nhân, đề nghị đổi/hủy/dạy bù.
- Sinh viên: tra cứu lịch học và nhận thông báo thay đổi.
- Ban Giám hiệu/Lãnh đạo: xem dashboard và báo cáo tổng quan.

## Module Chức Năng

- Auth & RBAC: đăng nhập, quản lý người dùng, phân quyền, khóa/mở tài khoản.
- Master Data: khoa/bộ môn, giảng viên, học phần, lớp học phần, phòng học, khung giờ, học kỳ.
- Teaching Preference: nguyện vọng giảng dạy, thời gian rảnh/bận, duyệt nguyện vọng.
- Assignment & Scheduling: phân công giảng viên, xếp lịch, lịch lặp, lịch nháp, duyệt và công bố.
- Conflict Detection: kiểm tra trùng giảng viên, phòng, lớp/nhóm, sức chứa phòng, loại phòng, tải giảng viên.
- Room & Resource: tra cứu phòng trống, giữ phòng, khóa phòng.
- Change Request: đổi giờ, đổi phòng, hủy buổi, dạy bù, lịch sử thay đổi.
- Calendar View: xem lịch theo giảng viên, phòng, lớp, khoa; dạng ngày/tuần/tháng/danh sách.
- Notification: thông báo công bố lịch, thay đổi lịch, nhắc lịch.
- Report & Dashboard: khối lượng giảng dạy, tỷ lệ sử dụng phòng, tiến độ xếp lịch, xuất Excel/PDF.
- Integration: đồng bộ dữ liệu đào tạo, SSO, API cho LMS/cổng sinh viên, iCal.
- Administration: cấu hình hệ thống, audit log, backup/restore.

## Tech Stack

- Monorepo: Turborepo
- Frontend: React, Vite, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui primitives
- Backend: Hono, oRPC
- Database: PostgreSQL, Drizzle ORM
- Language: TypeScript strict
- Tooling: Biome, Docker Compose

## Project Structure

```txt
tsms/
├── apps/
│   ├── web/          # React + TanStack Router frontend
│   └── server/       # Hono + oRPC backend host
├── packages/
│   ├── api/          # oRPC routers, business logic
│   ├── db/           # Drizzle schema, migrations, Docker database
│   ├── env/          # Environment validation
│   ├── ui/           # Shared shadcn/ui components
│   └── config/       # Shared TypeScript config
```

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start PostgreSQL with Docker:

```bash
pnpm db:start
```

Run migrations:

```bash
pnpm db:migrate
```

Run the development servers:

```bash
pnpm dev
```

Default URLs:

- Web: `http://localhost:3001`
- API: `http://localhost:3000`
- oRPC prefix: `http://localhost:3000/rpc`

## Database

The current Docker database is configured through `packages/db/docker-compose.yml`.

Common commands:

```bash
pnpm db:start
pnpm db:stop
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

If Docker PostgreSQL uses host port `5433`, configure:

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5433/tsms
```

## Development Notes

- Add backend procedures in `packages/api/src/routers`.
- Add database schema in `packages/db/src/schema` and export it from `packages/db/src/schema/index.ts`.
- Generate and run migrations after schema changes.
- Frontend routes live in `apps/web/src/routes`.
- Shared UI components live in `packages/ui/src/components`.
- Keep scheduling/conflict-detection logic testable and isolated from UI concerns.

## Acceptance Focus

Giai đoạn đầu nên ưu tiên các yêu cầu bắt buộc:

- Dữ liệu nền.
- Phân quyền.
- Phân công giảng viên.
- Lập lịch thủ công có kiểm tra xung đột.
- Tra cứu lịch.
- Audit log.
- Báo cáo cơ bản.

