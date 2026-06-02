import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@tsms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@tsms/ui/components/card";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  Home,
  LogOut,
  School,
  Settings,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const sidebarItems = [
    { label: "Trang chủ", icon: Home, active: true },
    { label: "Lập lịch dạy", icon: CalendarDays },
    { label: "Giảng viên", icon: Users },
    { label: "Sinh viên", icon: School },
    { label: "Học phần", icon: BookOpen },
    { label: "Phòng học", icon: DoorOpen },
    { label: "Báo cáo", icon: BarChart3 },
    { label: "Thông báo", icon: Bell },
    { label: "Cấu hình", icon: Settings },
  ];

  const stats = [
    { label: "Sinh viên", description: "Chưa có API thống kê sinh viên" },
    { label: "Giảng viên", description: "Chưa có API thống kê giảng viên" },
    { label: "Phòng học", description: "Chưa có API thống kê phòng học" },
    { label: "Học phần", description: "Chưa có API thống kê học phần" },
  ];

  const setupItems = [
    "Tạo schema và API cho sinh viên, giảng viên, phòng học, học phần",
    "Tạo API tổng quan dashboard theo học kỳ",
    "Kết nối dữ liệu thật vào các thẻ thống kê",
    "Tạo màn lập lịch và kiểm tra xung đột",
  ];

  return (
    <main className="min-h-svh bg-muted/30">
      <div className="grid min-h-svh lg:grid-cols-[260px_1fr]">
        <aside className="border-r bg-background">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center border bg-muted">
                  <GraduationCap />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">TSMS</p>
                  <h1 className="text-sm font-semibold">Quản lý lịch dạy</h1>
                </div>
              </div>
            </div>

            <nav className="flex flex-1 flex-col gap-1 p-3">
              {sidebarItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={[
                      "flex h-9 w-full items-center gap-2 border px-3 text-left text-xs transition-colors",
                      item.active
                        ? "border-foreground bg-foreground text-background"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                    ].join(" ")}
                  >
                    <Icon data-icon="inline-start" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="border-t p-3">
              <Link to="/login" className={buttonVariants({ variant: "outline", className: "w-full" })}>
                <LogOut data-icon="inline-start" />
                Đăng xuất
              </Link>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="border-b bg-background px-5 py-5">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Phòng Đào tạo
              </p>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Trang chủ</h2>
                  <p className="text-sm text-muted-foreground">
                    Tổng quan hệ thống sẽ hiển thị dữ liệu thật sau khi có API thống kê.
                  </p>
                </div>
                <div className="inline-flex w-fit items-center gap-2 border bg-muted px-3 py-1 text-xs text-muted-foreground">
                  <Building2 data-icon="inline-start" />
                  Chưa chọn học kỳ
                </div>
              </div>
            </div>
          </header>

          <div className="flex flex-col gap-5 p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardHeader>
                    <CardTitle>{stat.label}</CardTitle>
                    <CardDescription>{stat.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-muted-foreground">--</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <Card>
                <CardHeader>
                  <CardTitle>Các mục chức năng</CardTitle>
                  <CardDescription>
                    Sidebar đã chia theo các nhóm nghiệp vụ chính của hệ thống quản lý lịch dạy.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {sidebarItems.slice(1, 7).map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.label} className="flex items-center gap-3 border p-3">
                          <div className="flex size-8 items-center justify-center border bg-muted">
                            <Icon />
                          </div>
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trạng thái dữ liệu</CardTitle>
                  <CardDescription>Không hiển thị dữ liệu giả trên dashboard.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-muted-foreground">API thống kê</span>
                      <span>Chưa có</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-muted-foreground">Dữ liệu học kỳ</span>
                      <span>Chưa chọn</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dashboard</span>
                      <span>Khung giao diện</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Việc cần làm để nối dữ liệu thật</CardTitle>
                <CardDescription>
                  Các bước này là checklist triển khai, không phải dữ liệu mẫu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-xs">
                  {setupItems.map((item) => (
                    <li key={item} className="border px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

