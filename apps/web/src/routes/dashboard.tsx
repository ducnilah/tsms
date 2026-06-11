import { useQuery } from "@tanstack/react-query";
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
import { Home, Users } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { clearAuth, getAccessToken, getAuthUser } from "@/utils/auth-storage";
import { orpc } from "@/utils/orpc";

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

	useEffect(() => {
		if (!meQuery.error) {
			return;
		}

		clearAuth();
		navigate({ to: "/login" });
	}, [meQuery.error, navigate]);

	const currentUser = meQuery.data?.user ?? cachedUser;
	const isAdmin =
		currentUser?.roles.some((role) => role.roleName === "admin") ?? false;

	const stats = [
		{ label: "Sinh viên", description: "Chưa có API thống kê sinh viên" },
		{ label: "Giảng viên", description: "Chưa có API thống kê giảng viên" },
		{ label: "Phòng học", description: "Chưa có API thống kê phòng học" },
		{ label: "Học phần", description: "Chưa có API thống kê học phần" },
	];

	if (meQuery.isLoading && !currentUser) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	return (
		<AppShell
			currentUser={currentUser}
			pageTitle="Trang chủ"
			pageDescription={
				currentUser
					? `Đang đăng nhập bằng tài khoản ${currentUser.email}.`
					: "Đang kiểm tra phiên đăng nhập."
			}
		>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{stats.map((stat) => (
					<Card key={stat.label}>
						<CardHeader>
							<CardTitle>{stat.label}</CardTitle>
							<CardDescription>{stat.description}</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="font-semibold text-3xl text-muted-foreground">--</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-4 xl:grid-cols-[1fr_360px]">
				<Card>
					<CardHeader>
						<CardTitle>Các mục đang dùng</CardTitle>
						<CardDescription>
							Sidebar hiện chỉ giữ lại các đầu mục đang dùng.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-3 md:grid-cols-2">
							<div className="flex items-center gap-3 border p-3">
								<div className="flex size-8 items-center justify-center border bg-muted">
									<Home />
								</div>
								<span className="font-medium text-sm">Trang chủ</span>
							</div>
							{isAdmin ? (
								<div className="flex items-center gap-3 border p-3">
									<div className="flex size-8 items-center justify-center border bg-muted">
										<Users />
									</div>
									<span className="font-medium text-sm">
										Quản lý người dùng
									</span>
								</div>
							) : null}
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
					<CardTitle>Khu vực truy cập</CardTitle>
					<CardDescription>
						Hiển thị theo vai trò của tài khoản hiện tại.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-3 text-sm">
						<div className="border px-3 py-2">
							{isAdmin
								? "Bạn đang thấy Trang chủ và Quản lý người dùng."
								: "Bạn đang thấy Trang chủ."}
						</div>
						{isAdmin ? (
							<Link
								to="/users"
								className={buttonVariants({ variant: "outline" })}
							>
								<Users data-icon="inline-start" />
								Mở quản lý người dùng
							</Link>
						) : null}
					</div>
				</CardContent>
			</Card>
		</AppShell>
	);
}
