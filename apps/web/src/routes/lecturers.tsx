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

export const Route = createFileRoute("/lecturers")({
	component: LecturersRoute,
});

type LecturerStatus = "active" | "inactive";

type LecturerItem = {
	id: number;
	departmentId: number;
	name: string;
	email: string;
	phone: string;
	position: string;
	status: LecturerStatus;
};

type DepartmentOption = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	status: LecturerStatus;
};

type FacultyOption = {
	id: number;
	code: string;
	name: string;
	status: LecturerStatus;
};

function getStatusLabel(status: LecturerStatus) {
	return status === "active" ? "Đang hoạt động" : "Ngừng hoạt động";
}

function LecturersRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/lecturers/");
	const meQuery = useQuery({
		...orpc["auth.me"].queryOptions(),
		retry: false,
		staleTime: 60_000,
		meta: { skipErrorToast: true },
	});

	useEffect(() => {
		if (meQuery.isError && !meQuery.data?.user) {
			navigate({ to: "/login" });
		}
	}, [meQuery.data, meQuery.isError, navigate]);

	const currentUser = meQuery.data?.user ?? null;
	const permissionMap = meQuery.data?.permissionMap ?? {};
	const canRead = hasPermission(permissionMap, "lecturers", "read");
	const canCreate = hasPermission(permissionMap, "lecturers", "create");
	const canUpdate = hasPermission(permissionMap, "lecturers", "update");
	const canDelete = hasPermission(permissionMap, "lecturers", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [facultyFilterId, setFacultyFilterId] = useState(0);
	const [departmentFilterId, setDepartmentFilterId] = useState(0);
	const [selectedLecturerIds, setSelectedLecturerIds] = useState<number[]>([]);

	const lecturersQuery = useQuery({
		...orpc["lecturers.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as LecturerStatus) : undefined,
				facultyId: facultyFilterId || undefined,
				departmentId: departmentFilterId || undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		staleTime: 5 * 60_000,
		meta: { skipErrorToast: !canRead },
	});

	const departmentsQuery = useQuery({
		...orpc["departments.options"].queryOptions(),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		staleTime: 5 * 60_000,
		meta: { skipErrorToast: !canRead },
	});

	const lecturers = (lecturersQuery.data?.lecturers ?? []) as LecturerItem[];
	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];
	const departments = (departmentsQuery.data?.departments ?? []) as DepartmentOption[];
	const pagination = lecturersQuery.data?.pagination;
	const visibleDepartments = facultyFilterId
		? departments.filter((item) => item.facultyId === facultyFilterId)
		: departments;
	const departmentById = useMemo(
		() => new Map(departments.map((item) => [item.id, item])),
		[departments],
	);
	const selectedLecturerIdSet = useMemo(
		() => new Set(selectedLecturerIds),
		[selectedLecturerIds],
	);
	const currentPageLecturerIds = useMemo(
		() => lecturers.map((item) => item.id),
		[lecturers],
	);
	const hasVisibleLecturers = currentPageLecturerIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleLecturers &&
		currentPageLecturerIds.every((id) => selectedLecturerIdSet.has(id));

	useEffect(() => {
		setSelectedLecturerIds((currentIds) => {
			const nextIds = currentIds.filter((id) => currentPageLecturerIds.includes(id));
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageLecturerIds]);



	const deleteLecturerMutation = useMutation(
		orpc["lecturers.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} giảng viên`);
				setSelectedLecturerIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedLecturerIds(
			isAllCurrentPageSelected ? [] : currentPageLecturerIds,
		);
	};

	const toggleSelectLecturer = (lecturerId: number) => {
		setSelectedLecturerIds((currentIds) =>
			currentIds.includes(lecturerId)
				? currentIds.filter((id) => id !== lecturerId)
				: [...currentIds, lecturerId],
		);
	};

	const handleDeleteSelectedLecturers = () => {
		if (selectedLecturerIds.length === 0) return;
		if (!confirm(`Xóa ${selectedLecturerIds.length} giảng viên đã chọn?`)) return;
		deleteLecturerMutation.mutate({ lecturerIds: selectedLecturerIds });
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
				pageTitle="Quản lý giảng viên"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý giảng viên."
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
			pageTitle="Quản lý giảng viên"
			pageDescription="Theo dõi danh sách giảng viên, lọc theo khoa/bộ môn và thao tác hàng loạt."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-bold">Danh sách giảng viên</CardTitle>
							<CardDescription>
								Theo dõi hồ sơ giảng viên theo khoa, bộ môn và trạng thái.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							{canDelete && selectedLecturerIds.length > 0 ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteSelectedLecturers}
									disabled={deleteLecturerMutation.isPending}
								>
									<Trash2 data-icon="inline-start" />
									Xóa {selectedLecturerIds.length} giảng viên
								</Button>
							) : null}
							{canCreate ? (
								<Button type="button" onClick={() => navigate({ to: "/lecturers/create" })}>
									<Plus data-icon="inline-start" />
									Thêm giảng viên
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="lecturer-search">Tìm kiếm</Label>
							<Input
								id="lecturer-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Tìm theo tên, email hoặc số điện thoại"
							/>
						</div>
						<div className="grid gap-3 md:grid-cols-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="lecturer-filter-faculty">Khoa</Label>
								<select
									id="lecturer-filter-faculty"
									className="h-9 border bg-background px-3 text-sm"
									value={facultyFilterId}
									onChange={(event) => {
										setFacultyFilterId(Number(event.target.value));
										setDepartmentFilterId(0);
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
								<Label htmlFor="lecturer-filter-department">Bộ môn</Label>
								<select
									id="lecturer-filter-department"
									className="h-9 border bg-background px-3 text-sm"
									value={departmentFilterId}
									onChange={(event) => {
										setDepartmentFilterId(Number(event.target.value));
										setPage(1);
									}}
								>
									<option value={0}>Tất cả bộ môn</option>
									{visibleDepartments.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="lecturer-filter-status">Trạng thái</Label>
								<select
									id="lecturer-filter-status"
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
									<col className="w-50" />
									<col className="w-64" />
									<col className="w-64" />
									<col className="w-30" />
									<col className="w-48" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="w-12 px-4 py-3">
											<input
												type="checkbox"
												aria-label="Chọn tất cả giảng viên trên trang hiện tại"
												checked={isAllCurrentPageSelected}
												disabled={!hasVisibleLecturers}
												onChange={toggleSelectAllCurrentPage}
											/>
										</th>
										<th className="px-4 py-3 font-medium">Giảng viên</th>
										<th className="px-4 py-3 font-medium">Liên hệ</th>
										<th className="px-4 py-3 font-medium">Bộ môn</th>
										<th className="px-4 py-3 pl-8 font-medium">Trạng thái</th>
										<th className="px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{lecturersQuery.isLoading ||
									facultiesQuery.isLoading ||
									departmentsQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={6} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : lecturersQuery.error ||
										facultiesQuery.error ||
										departmentsQuery.error ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách giảng viên.
											</td>
										</tr>
									) : lecturers.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy giảng viên phù hợp.
											</td>
										</tr>
									) : (
										lecturers.map((item) => {
											const department = departmentById.get(item.departmentId);

											return (
												<tr key={item.id} className="border-t hover:bg-muted/40">
													<td className="px-4 py-4">
														<input
															type="checkbox"
															aria-label={`Chọn giảng viên ${item.name}`}
															checked={selectedLecturerIdSet.has(item.id)}
															onChange={() => toggleSelectLecturer(item.id)}
														/>
													</td>
													<td className="px-4 py-4">
														<div className="truncate font-medium">{item.name}</div>
														<div className="text-muted-foreground text-xs">
															{item.position}
														</div>
													</td>
													<td className="px-4 py-4">
														<div className="truncate">{item.email}</div>
														<div className="text-muted-foreground text-xs">{item.phone}</div>
													</td>
													<td className="px-4 py-4">
														<div className="truncate">
															{department?.name ?? "Không xác định"}
														</div>
														<div className="text-muted-foreground text-xs">
															{department?.code ?? `ID ${item.departmentId}`}
														</div>
													</td>
													<td className="px-4 py-4 ">
														<span className="inline-flex w-fit items-center rounded border px-2.5 py-1 text-xs">
															{getStatusLabel(item.status)}
														</span>
													</td>
													<td className="px-4 py-4 text-right">
												{canUpdate ? (
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															navigate({
																to: "/lecturers/$lecturerId/edit",
																params: { lecturerId: String(item.id) },
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
