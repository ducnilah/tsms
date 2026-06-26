import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { buttonVariants } from "@tsms/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@tsms/ui/components/card";
import { Home, ShieldCheck, Users } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { orpc } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/dashboard")({
	component: DashboardRoute,
});

function DashboardRoute() {
	const navigate = useNavigate();
	const meQuery = useQuery({
		...orpc["auth.me"].queryOptions(),
		retry: false,
		meta: { skipErrorToast: true },
	});

	useEffect(() => {
		if (meQuery.isError && !meQuery.data?.user) {
			navigate({ to: "/login" });
		}
	}, [meQuery.data, meQuery.isError, navigate]);

	const currentUser = meQuery.data?.user ?? null;
	const permissionMap = meQuery.data?.permissionMap ?? {};
	const canReadUsers = hasPermission(permissionMap, "users", "read");
	const canReadRoles = hasPermission(permissionMap, "roles", "read");

	const stats = [
		{ label: "Sinh viên", description: "Chưa có API thống kê sinh viên" },
		{ label: "Giảng viên", description: "Chưa có API thống kê giảng viên" },
		{ label: "Phòng học", description: "Chưa có API thống kê phòng học" },
		{ label: "Học phần", description: "Chưa có API thống kê học phần" },
	];

	const accessItems = [
		{ label: "Trang chủ", icon: Home, visible: true, to: "/dashboard" as const },
		{
			label: "Quản lý người dùng",
			icon: Users,
			visible: canReadUsers,
			to: "/users" as const,
		},
		{
			label: "Quản lý vai trò",
			icon: ShieldCheck,
			visible: canReadRoles,
			to: "/roles" as const,
		},
	].filter((item) => item.visible);

	if (meQuery.isLoading && !currentUser) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return <main className="p-6 text-sm">Đang kiểm tra phiên đăng nhập...</main>;
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Trang chủ"
			pageDescription={`Đang đăng nhập bằng tài khoản ${currentUser.email}.`}
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
						<CardTitle>Khu vực đang sử dụng</CardTitle>
						<CardDescription>
							Hệ thống hiển thị các mục phù hợp với quyền hiện tại của tài
							khoản.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-3 md:grid-cols-2">
							{accessItems.map((item) => {
								const Icon = item.icon;
								return (
									<div key={item.label} className="flex items-center gap-3 border p-3">
										<div className="flex size-8 items-center justify-center border bg-muted">
											<Icon />
										</div>
										<span className="font-medium text-sm">{item.label}</span>
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
							Dashboard hiện đang ở giai đoạn khung giao diện.
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
								<span className="text-muted-foreground">Tiến độ</span>
								<span>Đang hoàn thiện</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Lối tắt truy cập</CardTitle>
					<CardDescription>
						Chỉ hiển thị những khu vực mà tài khoản này có thể sử dụng.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-3 text-sm">
						{accessItems.length > 0 ? (
							accessItems.map((item) => {
								const Icon = item.icon;
								return (
									<Link
										key={item.to}
										to={item.to}
										className={buttonVariants({ variant: "outline" })}
									>
										<Icon data-icon="inline-start" />
										Mở {item.label.toLowerCase()}
									</Link>
								);
							})
						) : (
							<div className="border px-3 py-2">
								Tài khoản này đã đăng nhập nhưng chưa được cấp khu vực quản trị
								nào.
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</AppShell>
	);
}
