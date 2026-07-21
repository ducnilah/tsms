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

export const Route = createFileRoute("/departments")({
	component: DepartmentsRoute,
});

type DepartmentStatus = "active" | "inactive";

type FacultyOption = {
	id: number;
	code: string;
	name: string;
	status: "active" | "inactive";
};

type DepartmentItem = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	description: string;
	status: DepartmentStatus;
	createdAt?: string | Date;
};

function formatDate(value?: string | Date) {
	if (!value) return "Chưa có dữ liệu";

	const date = new Date(value);
	const formattedDate = new Intl.DateTimeFormat("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
	const formattedTime = new Intl.DateTimeFormat("vi-VN", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).format(date);

	return `${formattedDate} ${formattedTime}`;
}

function getStatusLabel(status: DepartmentStatus) {
	return status === "active" ? "Đang hoạt động" : "Ngừng hoạt động";
}

function DepartmentsRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/departments/");
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
	const canRead = hasPermission(permissionMap, "departments", "read");
	const canCreate = hasPermission(permissionMap, "departments", "create");
	const canUpdate = hasPermission(permissionMap, "departments", "update");
	const canDelete = hasPermission(permissionMap, "departments", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [facultyFilterId, setFacultyFilterId] = useState(0);
	const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([]);

	const departmentsQuery = useQuery({
		...orpc["departments.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as DepartmentStatus) : undefined,
				facultyId: facultyFilterId || undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const departments = (departmentsQuery.data?.departments ?? []) as DepartmentItem[];
	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];
	const pagination = departmentsQuery.data?.pagination;
	const facultyById = useMemo(
		() => new Map(faculties.map((item) => [item.id, item])),
		[faculties],
	);
	const selectedDepartmentIdSet = useMemo(
		() => new Set(selectedDepartmentIds),
		[selectedDepartmentIds],
	);
	const currentPageDepartmentIds = useMemo(
		() => departments.map((item) => item.id),
		[departments],
	);
	const hasVisibleDepartments = currentPageDepartmentIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleDepartments &&
		currentPageDepartmentIds.every((id) => selectedDepartmentIdSet.has(id));

	useEffect(() => {
		setSelectedDepartmentIds((currentIds) => {
			const nextIds = currentIds.filter((id) => currentPageDepartmentIds.includes(id));
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageDepartmentIds]);

	const deleteDepartmentMutation = useMutation(
		orpc["departments.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} bộ môn`);
				setSelectedDepartmentIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedDepartmentIds(
			isAllCurrentPageSelected ? [] : currentPageDepartmentIds,
		);
	};

	const toggleSelectDepartment = (departmentId: number) => {
		setSelectedDepartmentIds((currentIds) =>
			currentIds.includes(departmentId)
				? currentIds.filter((id) => id !== departmentId)
				: [...currentIds, departmentId],
		);
	};

	const handleDeleteSelectedDepartments = () => {
		if (selectedDepartmentIds.length === 0) return;
		if (!confirm(`Xóa ${selectedDepartmentIds.length} bộ môn đã chọn?`)) return;
		deleteDepartmentMutation.mutate({ departmentIds: selectedDepartmentIds });
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
				pageTitle="Quản lý bộ môn"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý bộ môn."
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
			pageTitle="Quản lý bộ môn"
			pageDescription="Theo dõi danh sách bộ môn, lọc theo khoa và thao tác hàng loạt."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-bold">Danh sách bộ môn</CardTitle>
							<CardDescription>
								Theo dõi bộ môn theo khoa, trạng thái và thao tác chỉnh sửa.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							{canDelete && selectedDepartmentIds.length > 0 ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteSelectedDepartments}
									disabled={deleteDepartmentMutation.isPending}
								>
									<Trash2 data-icon="inline-start" />
									Xóa {selectedDepartmentIds.length} bộ môn
								</Button>
							) : null}
							{canCreate ? (
								<Button type="button" onClick={() => navigate({ to: "/departments/create" })}>
									<Plus data-icon="inline-start" />
									Thêm bộ môn
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="department-search">Tìm kiếm</Label>
							<Input
								id="department-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Tìm theo mã bộ môn"
							/>
						</div>
						<div className="grid gap-3 md:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="department-filter-faculty">Khoa</Label>
								<select
									id="department-filter-faculty"
									className="h-9 border bg-background px-3 text-sm"
									value={facultyFilterId}
									onChange={(event) => {
										setFacultyFilterId(Number(event.target.value));
										setPage(1);
									}}
								>
									<option value={0}>Tất cả khoa</option>
									{faculties.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="department-filter-status">Trạng thái</Label>
								<select
									id="department-filter-status"
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
					</div>

					<div className="overflow-hidden border">
						<div className="max-h-[31rem] overflow-y-auto">
							<table className="w-full table-fixed text-[15px]">
								<colgroup>
									<col className="w-12" />
									<col className="w-80" />
									<col className="w-80" />
									<col className="w-50" />
									<col className="w-48" />
									<col className="w-32" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="w-12 px-4 py-3">
											<input
												type="checkbox"
												aria-label="Chọn tất cả bộ môn trên trang hiện tại"
												checked={isAllCurrentPageSelected}
												disabled={!hasVisibleDepartments}
												onChange={toggleSelectAllCurrentPage}
											/>
										</th>
										<th className="px-4 py-3 font-medium">Bộ môn</th>
										<th className="px-4 py-3 font-medium">Khoa</th>
										<th className="px-4 py-3 pl-8 font-medium">Trạng thái</th>
										<th className="px-4 py-3 pl-13 font-medium">Ngày tạo</th>
										<th className="px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{departmentsQuery.isLoading || facultiesQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={6} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : departmentsQuery.error || facultiesQuery.error ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách bộ môn.
											</td>
										</tr>
									) : departments.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy bộ môn phù hợp.
											</td>
										</tr>
									) : (
										departments.map((item) => {
											const faculty = facultyById.get(item.facultyId);

											return (
												<tr key={item.id} className="border-t hover:bg-muted/40">
													<td className="px-4 py-4">
														<input
															type="checkbox"
															aria-label={`Chọn bộ môn ${item.name}`}
															checked={selectedDepartmentIdSet.has(item.id)}
															onChange={() => toggleSelectDepartment(item.id)}
														/>
													</td>
													<td className="px-4 py-4">
														<div className="truncate font-medium">{item.name}</div>
														<div className="text-muted-foreground text-xs">{item.code}</div>
													</td>
													<td className="px-4 py-4">
														<div className="truncate">{faculty?.name ?? "Không xác định"}</div>
														<div className="text-muted-foreground text-xs">
															{faculty?.code ?? `ID ${item.facultyId}`}
														</div>
													</td>
													<td className="px-4 py-4">
														<span className="inline-flex w-fit items-center rounded border px-2.5 py-1 text-xs">
															{getStatusLabel(item.status)}
														</span>
													</td>
													<td className="whitespace-nowrap px-4 py-4">
														{formatDate(item.createdAt)}
													</td>
													<td className="px-4 py-4 text-right">
												{canUpdate ? (
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															navigate({
																to: "/departments/$departmentId/edit",
																params: { departmentId: String(item.id) },
															})
														}
													>
														<Pencil data-icon="inline-start" />
														Sửa
													</Button>
												) : null}
											</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					<PaginationControls
						pagination={pagination}
						limit={limit}
						onLimitChange={(nextLimit) => {
							setLimit(nextLimit);
							setPage(1);
						}}
						onPageChange={setPage}
					/>
				</CardContent>
			</Card>
		</AppShell>
	);
}
