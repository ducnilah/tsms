import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@tsms/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@tsms/ui/components/card";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Skeleton } from "@tsms/ui/components/skeleton";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PaginationControls } from "@/components/pagination-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/faculties")({
	component: FacultiesRoute,
});

type FacultyStatus = "active" | "inactive";

type FacultyItem = {
	id: number;
	code: string;
	name: string;
	status: FacultyStatus;
	createdAt: string | Date;
};

function formatDate(value: string | Date) {
	return new Intl.DateTimeFormat("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(value));
}

function getStatusLabel(status: FacultyStatus) {
	return status === "active" ? "Đang hoạt động" : "Ngừng hoạt động";
}

function FacultiesRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/faculties/");
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
	const canRead = hasPermission(permissionMap, "faculties", "read");
	const canCreate = hasPermission(permissionMap, "faculties", "create");
	const canUpdate = hasPermission(permissionMap, "faculties", "update");
	const canDelete = hasPermission(permissionMap, "faculties", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);

	const facultiesQuery = useQuery({
		...orpc["faculties.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as FacultyStatus) : undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyItem[];
	const pagination = facultiesQuery.data?.pagination;
	const selectedFacultyIdSet = useMemo(
		() => new Set(selectedFacultyIds),
		[selectedFacultyIds],
	);
	const currentPageFacultyIds = useMemo(
		() => faculties.map((item) => item.id),
		[faculties],
	);
	const hasVisibleFaculties = currentPageFacultyIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleFaculties && currentPageFacultyIds.every((id) => selectedFacultyIdSet.has(id));

	useEffect(() => {
		setSelectedFacultyIds((currentIds) => {
			const nextIds = currentIds.filter((id) => currentPageFacultyIds.includes(id));
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageFacultyIds]);

	const deleteFacultiesMutation = useMutation(
		orpc["faculties.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} khoa`);
				setSelectedFacultyIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedFacultyIds(isAllCurrentPageSelected ? [] : currentPageFacultyIds);
	};

	const toggleSelectFaculty = (facultyId: number) => {
		setSelectedFacultyIds((currentIds) =>
			currentIds.includes(facultyId)
				? currentIds.filter((id) => id !== facultyId)
				: [...currentIds, facultyId],
		);
	};

	const handleDeleteSelectedFaculties = () => {
		if (selectedFacultyIds.length === 0) return;

		if (!confirm(`Xóa ${selectedFacultyIds.length} khoa đã chọn?`)) {
			return;
		}

		deleteFacultiesMutation.mutate({ facultyIds: selectedFacultyIds });
	};

	if (isChildRoute) {
		return <Outlet />;
	}

	if (meQuery.isLoading && !currentUser) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return <main className="p-6 text-sm">Đang kiểm tra phiên đăng nhập...</main>;
	}

	if (!canRead) {
		return (
			<AppShell
				currentUser={currentUser}
				permissionMap={permissionMap}
				pageTitle="Quản lý khoa"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý khoa."
			>
				<Card>
					<CardHeader>
						<CardTitle>Không đủ quyền truy cập</CardTitle>
						<CardDescription>
							Hãy liên hệ quản trị viên nếu bạn cần được cấp quyền phù hợp.
						</CardDescription>
					</CardHeader>
				</Card>
			</AppShell>
		);
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Quản lý khoa"
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-semibold">Danh sách khoa</CardTitle>
						</div>
						<div className="flex flex-wrap gap-2">
							{canDelete && selectedFacultyIds.length > 0 ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteSelectedFaculties}
									disabled={deleteFacultiesMutation.isPending}
								>
									<Trash2 data-icon="inline-start" />
									Xóa {selectedFacultyIds.length} khoa
								</Button>
							) : null}
							{canCreate ? (
								<Button type="button" onClick={() => navigate({ to: "/faculties/create" })}>
									<Plus data-icon="inline-start" />
									Thêm khoa
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
						<div className="flex flex-col gap-2">
							<Label htmlFor="faculty-search">Tìm kiếm</Label>
							<Input
								id="faculty-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Nhập mã khoa hoặc tên khoa..."
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="faculty-status">Trạng thái</Label>
							<select
								id="faculty-status"
								className="h-9 border bg-background px-3 text-sm"
								value={statusFilter}
								onChange={(event) => {
									setStatusFilter(event.target.value);
									setPage(1);
								}}
							>
								<option value="">Tất cả</option>
								<option value="active">Đang hoạt động</option>
								<option value="inactive">Ngừng hoạt động</option>
							</select>
						</div>
					</div>

					<div className="overflow-hidden border">
						<div className="max-h-[31rem] overflow-y-auto">
							<table className="w-full text-[15px]">
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="w-12 px-4 py-3">
											<input
												type="checkbox"
												aria-label="Chọn tất cả khoa trên trang hiện tại"
												checked={isAllCurrentPageSelected}
												disabled={!hasVisibleFaculties}
												onChange={toggleSelectAllCurrentPage}
											/>
										</th>
										<th className="px-4 py-3 font-medium">Tên khoa</th>
										<th className="px-4 py-3 font-medium">Mã khoa</th>
										<th className="px-4 py-3 font-medium">Trạng thái</th>
										<th className="px-4 py-3 font-medium">Ngày tạo</th>
										<th className="w-28 px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{facultiesQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={6} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : facultiesQuery.error ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách khoa.
											</td>
										</tr>
									) : faculties.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
												Chưa có khoa nào trong hệ thống.
											</td>
										</tr>
									) : (
										faculties.map((item) => (
											<tr key={item.id} className="border-t hover:bg-muted/40">
												<td className="px-4 py-4">
													<input
														type="checkbox"
														aria-label={`Chọn khoa ${item.name}`}
														checked={selectedFacultyIdSet.has(item.id)}
														onChange={() => toggleSelectFaculty(item.id)}
													/>
												</td>
												<td className="px-4 py-4 font-medium">{item.name}</td>
												<td className="px-4 py-4 text-muted-foreground">{item.code}</td>
												<td className="px-4 py-4">
													<span className="border px-2.5 py-1 text-xs">
														{getStatusLabel(item.status)}
													</span>
												</td>
												<td className="px-4 py-4">{formatDate(item.createdAt)}</td>
												<td className="px-4 py-4 text-right">
													{canUpdate ? (
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() =>
																navigate({
																	to: "/faculties/$facultyId/edit",
																	params: { facultyId: String(item.id) },
																})
															}
														>
															<Pencil data-icon="inline-start" />
															Sửa
														</Button>
													) : null}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex justify-end">
						<PaginationControls
							pagination={pagination}
							limit={limit}
							onPageChange={setPage}
							onLimitChange={(nextLimit) => {
								setLimit(nextLimit);
								setPage(1);
							}}
						/>
					</div>
				</CardContent>
			</Card>
		</AppShell>
	);
}
