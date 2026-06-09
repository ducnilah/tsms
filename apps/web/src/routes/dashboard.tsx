import { useMutation, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
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
	DoorOpen,
	GraduationCap,
	Home,
	LogOut,
	School,
	Settings,
	Users,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import {
	clearAuth,
	getAccessToken,
	getAuthUser,
	getRefreshToken,
} from "@/utils/auth-storage";
import { orpc } from "@/utils/orpc";

type SidebarItem = {
	label: string;
	icon: typeof Home;
	active?: boolean;
	to?: "/users";
};

export const Route = createFileRoute("/dashboard")({
	beforeLoad: () => {
		if (typeof window !== "undefined" && !getAccessToken()) {
			throw redirect({ to: "/login" });
		}
	},
	component: DashboardRoute,
});

function DashboardRoute() {
	const navigate = useNavigate();
	const cachedUser = getAuthUser();
	const meQuery = useQuery(orpc["auth.me"].queryOptions());
	const logoutMutation = useMutation(
		orpc["auth.logout"].mutationOptions({
			onSuccess: () => {
				clearAuth();
				toast.success("Đã đăng xuất");
				navigate({ to: "/login" });
			},
			onError: () => {
				clearAuth();
				navigate({ to: "/login" });
			},
		}),
	);

	useEffect(() => {
		if (!meQuery.error) {
			return;
		}

		clearAuth();
		navigate({ to: "/login" });
	}, [meQuery.error, navigate]);

	const currentUser = meQuery.data?.user ?? cachedUser;

	const handleLogout = () => {
		const refreshToken = getRefreshToken();

		if (!refreshToken) {
			clearAuth();
			navigate({ to: "/login" });
			return;
		}

		logoutMutation.mutate({ refreshToken });
	};

	const sidebarItems: SidebarItem[] = [
		{ label: "Trang chủ", icon: Home, active: true },
		{ label: "Lập lịch dạy", icon: CalendarDays },
		{ label: "Giảng viên", icon: Users },
		{ label: "Sinh viên", icon: School },
		{ label: "Học phần", icon: BookOpen },
		{ label: "Phòng học", icon: DoorOpen },
		{ label: "Báo cáo", icon: BarChart3 },
		{ label: "Thông báo", icon: Bell },
		{ label: "Cấu hình", icon: Settings },
		{ label: "Người dùng", icon: Users, to: "/users" as const },
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
									<p className="text-muted-foreground text-xs">TSMS</p>
									<h1 className="font-semibold text-sm">Quản lý lịch dạy</h1>
								</div>
							</div>
						</div>

						<nav className="flex flex-1 flex-col gap-1 p-3">
							{sidebarItems.map((item) => {
								const Icon = item.icon;

								const className = [
									"flex h-9 w-full items-center gap-2 border px-3 text-left text-xs transition-colors",
									item.active
										? "border-foreground bg-foreground text-background"
										: "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
								].join(" ");

								if (item.to) {
									return (
										<Link key={item.label} to={item.to} className={className}>
											<Icon data-icon="inline-start" />
											{item.label}
										</Link>
									);
								}

								return (
									<button key={item.label} type="button" className={className}>
										<Icon data-icon="inline-start" />
										{item.label}
									</button>
								);
							})}
						</nav>

						<div className="border-t p-3">
							<button
								type="button"
								className={buttonVariants({
									variant: "outline",
									className: "w-full",
								})}
								disabled={logoutMutation.isPending}
								onClick={handleLogout}
							>
								<LogOut data-icon="inline-start" />
								Đăng xuất
							</button>
						</div>
					</div>
				</aside>

				<section className="flex min-w-0 flex-col">
					<header className="border-b bg-background px-5 py-5">
						<div className="flex flex-col gap-2">
							<p className="text-muted-foreground text-xs uppercase tracking-widest">
								Phòng Đào tạo
							</p>
							<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
								<div>
									<h2 className="font-semibold text-2xl">Trang chủ</h2>
									<p className="text-muted-foreground text-sm">
										{currentUser
											? `Đang đăng nhập bằng tài khoản ${currentUser.email}.`
											: "Đang kiểm tra phiên đăng nhập."}
									</p>
								</div>
								<div className="inline-flex w-fit items-center gap-2 border bg-muted px-3 py-1 text-muted-foreground text-xs">
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
										<p className="font-semibold text-3xl text-muted-foreground">
											--
										</p>
									</CardContent>
								</Card>
							))}
						</div>

						<div className="grid gap-4 xl:grid-cols-[1fr_360px]">
							<Card>
								<CardHeader>
									<CardTitle>Các mục chức năng</CardTitle>
									<CardDescription>
										Sidebar đã chia theo các nhóm nghiệp vụ chính của hệ thống
										quản lý lịch dạy.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid gap-3 md:grid-cols-2">
										{sidebarItems.slice(1, 7).map((item) => {
											const Icon = item.icon;

											return (
												<div
													key={item.label}
													className="flex items-center gap-3 border p-3"
												>
													<div className="flex size-8 items-center justify-center border bg-muted">
														<Icon />
													</div>
													<span className="font-medium text-sm">
														{item.label}
													</span>
												</div>
											);
										})}
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Trạng thái dữ liệu</CardTitle>
									<CardDescription>
										Không hiển thị dữ liệu giả trên dashboard.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex flex-col gap-3 text-xs">
										<div className="flex items-center justify-between border-b pb-2">
											<span className="text-muted-foreground">
												API thống kê
											</span>
											<span>Chưa có</span>
										</div>
										<div className="flex items-center justify-between border-b pb-2">
											<span className="text-muted-foreground">
												Dữ liệu học kỳ
											</span>
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
