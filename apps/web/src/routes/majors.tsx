import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@tsms/ui/components/card";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { orpc } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/majors")({
	component: MajorsRoute,
});

function MajorsRoute() {
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
	const canRead = hasPermission(permissionMap, "majors", "read");

	if (meQuery.isLoading) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return null;
	}

	if (!canRead) {
		return (
			<AppShell
				currentUser={currentUser}
				permissionMap={permissionMap}
				pageTitle="Quản lý ngành học"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý ngành học."
			>
				<Card>
					<CardContent className="p-6 text-muted-foreground text-sm">
						Vui lòng liên hệ quản trị viên để được cấp quyền phù hợp.
					</CardContent>
				</Card>
			</AppShell>
		);
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Quản lý ngành học"
			pageDescription="Quản lý ngành đào tạo, khoa phụ trách và các chương trình đào tạo thuộc ngành."
		>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
				<Card>
					<CardHeader>
						<CardTitle>Danh sách ngành học</CardTitle>
						<CardDescription>
							Tìm kiếm, lọc và chọn một ngành để xem chi tiết.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Bước tiếp theo sẽ thêm search, filter và bảng danh sách ngành.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Chi tiết ngành học</CardTitle>
						<CardDescription>
							Khu vực này sẽ hiển thị thông tin ngành và các chương trình đào tạo liên quan.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Hãy chọn một ngành ở danh sách bên trái để xem chi tiết.
						</p>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
