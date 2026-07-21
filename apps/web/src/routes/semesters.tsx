import { useMutation, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
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
import {
	SEMESTER_STATUS_OPTIONS,
	SEMESTER_TYPE_OPTIONS,
	type AcademicYearOption,
	type SemesterStatus,
	type SemesterType,
} from "@/components/semester-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/semesters")({
	component: SemestersRoute,
});

type SemesterItem = {
	id: number;
	academicYearId: number;
	code: string;
	name: string;
	type: SemesterType;
	startDate: string;
	endDate: string;
	status: SemesterStatus;
	createdAt?: string | Date;
};

function formatDateTime(value?: string | Date) {
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

function getStatusLabel(status: SemesterStatus) {
	return SEMESTER_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function getTypeLabel(type: SemesterType) {
	return SEMESTER_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

function getAcademicYearLabel(academicYears: AcademicYearOption[], academicYearId: number) {
	const academicYear = academicYears.find((item) => item.id === academicYearId);
	return academicYear ? `${academicYear.name} (${academicYear.code})` : "Chưa rõ năm học";
}

function SemestersRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/semesters/");
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
	const canRead = hasPermission(permissionMap, "semesters", "read");
	const canCreate = hasPermission(permissionMap, "semesters", "create");
	const canUpdate = hasPermission(permissionMap, "semesters", "update");
	const canDelete = hasPermission(permissionMap, "semesters", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [academicYearFilterId, setAcademicYearFilterId] = useState(0);
	const [typeFilter, setTypeFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedSemesterIds, setSelectedSemesterIds] = useState<number[]>([]);

	const semestersQuery = useQuery({
		...orpc["semesters.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				academicYearId: academicYearFilterId || undefined,
				type: typeFilter ? (typeFilter as SemesterType) : undefined,
				status: statusFilter ? (statusFilter as SemesterStatus) : undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const academicYearsQuery = useQuery({
		...orpc["academicYears.options"].queryOptions(),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const semesters = (semestersQuery.data?.semesters ?? []) as SemesterItem[];
	const academicYears = (academicYearsQuery.data?.academicYears ??
		[]) as AcademicYearOption[];
	const pagination = semestersQuery.data?.pagination;
	const selectedSemesterIdSet = useMemo(
		() => new Set(selectedSemesterIds),
		[selectedSemesterIds],
	);
	const currentPageSemesterIds = useMemo(
		() => semesters.map((item) => item.id),
		[semesters],
	);
	const hasVisibleSemesters = currentPageSemesterIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleSemesters &&
		currentPageSemesterIds.every((id) => selectedSemesterIdSet.has(id));

	useEffect(() => {
		setSelectedSemesterIds((currentIds) => {
			const nextIds = currentIds.filter((id) => currentPageSemesterIds.includes(id));
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageSemesterIds]);

	const deleteSemesterMutation = useMutation(
		orpc["semesters.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} học kỳ`);
				setSelectedSemesterIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedSemesterIds(isAllCurrentPageSelected ? [] : currentPageSemesterIds);
	};

	const toggleSelectSemester = (semesterId: number) => {
		setSelectedSemesterIds((currentIds) =>
			currentIds.includes(semesterId)
				? currentIds.filter((id) => id !== semesterId)
				: [...currentIds, semesterId],
		);
	};

	const handleDeleteSelectedSemesters = () => {
		if (selectedSemesterIds.length === 0) return;
		if (!confirm(`Xóa ${selectedSemesterIds.length} học kỳ đã chọn?`)) return;
		deleteSemesterMutation.mutate({ semesterIds: selectedSemesterIds });
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
				pageTitle="Quản lý học kỳ"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý học kỳ."
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
			pageTitle="Quản lý học kỳ"
			pageDescription="Quản lý mốc thời gian, loại học kỳ và trạng thái mở/khóa theo từng năm học."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-bold">Danh sách học kỳ</CardTitle>
							<CardDescription>
								Tìm theo mã/tên học kỳ và lọc theo năm học, loại học kỳ, trạng thái.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							{canDelete && selectedSemesterIds.length > 0 ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteSelectedSemesters}
									disabled={deleteSemesterMutation.isPending}
								>
									<Trash2 data-icon="inline-start" />
									Xóa {selectedSemesterIds.length} học kỳ
								</Button>
							) : null}
							{canCreate ? (
								<Button type="button" onClick={() => navigate({ to: "/semesters/create" })}>
									<Plus data-icon="inline-start" />
									Thêm học kỳ
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="semester-search">Tìm kiếm</Label>
							<Input
								id="semester-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Tìm theo mã hoặc tên học kỳ"
							/>
						</div>
						<div className="grid gap-3 md:grid-cols-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="semester-filter-year">Năm học</Label>
								<select
									id="semester-filter-year"
									className="h-9 border bg-background px-3 text-sm"
									value={academicYearFilterId}
									onChange={(event) => {
										setAcademicYearFilterId(Number(event.target.value));
										setPage(1);
									}}
								>
									<option value={0}>Tất cả</option>
									{academicYears.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name} ({item.code})
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="semester-filter-type">Loại học kỳ</Label>
								<select
									id="semester-filter-type"
									className="h-9 border bg-background px-3 text-sm"
									value={typeFilter}
									onChange={(event) => {
										setTypeFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả</option>
									{SEMESTER_TYPE_OPTIONS.map((item) => (
										<option key={item.value} value={item.value}>
											{item.label}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="semester-filter-status">Trạng thái</Label>
								<select
									id="semester-filter-status"
									className="h-9 border bg-background px-3 text-sm"
									value={statusFilter}
									onChange={(event) => {
										setStatusFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả</option>
									{SEMESTER_STATUS_OPTIONS.map((item) => (
										<option key={item.value} value={item.value}>
											{item.label}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					<div className="overflow-hidden border">
						<div className="max-h-[31rem] overflow-y-auto">
							<table className="w-full table-fixed text-[15px]">
								<colgroup>
									<col className="w-12" />
									<col />
									<col className="w-52" />
									<col className="w-36" />
									<col className="w-52" />
									<col className="w-36" />
									<col className="w-48" />
									<col className="w-32" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="w-12 px-4 py-3">
											<input
												type="checkbox"
												aria-label="Chọn tất cả học kỳ trên trang hiện tại"
												checked={isAllCurrentPageSelected}
												disabled={!hasVisibleSemesters}
												onChange={toggleSelectAllCurrentPage}
											/>
										</th>
										<th className="px-4 py-3 font-medium">Học kỳ</th>
										<th className="px-4 py-3 font-medium">Năm học</th>
										<th className="px-4 py-3 font-medium">Loại</th>
										<th className="px-4 py-3 font-medium">Thời gian</th>
										<th className="px-4 py-3 font-medium">Trạng thái</th>
										<th className="px-4 py-3 font-medium">Ngày tạo</th>
										<th className="px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{semestersQuery.isLoading || academicYearsQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={8} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : semestersQuery.error || academicYearsQuery.error ? (
										<tr>
											<td colSpan={8} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách học kỳ.
											</td>
										</tr>
									) : semesters.length === 0 ? (
										<tr>
											<td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy học kỳ phù hợp.
											</td>
										</tr>
									) : (
										semesters.map((item) => (
											<tr key={item.id} className="border-t hover:bg-muted/40">
												<td className="px-4 py-4">
													<input
														type="checkbox"
														aria-label={`Chọn học kỳ ${item.code}`}
														checked={selectedSemesterIdSet.has(item.id)}
														onChange={() => toggleSelectSemester(item.id)}
													/>
												</td>
												<td className="px-4 py-4">
													<div className="font-medium">{item.name}</div>
													<div className="text-muted-foreground text-xs">{item.code}</div>
												</td>
												<td className="px-4 py-4">
													{getAcademicYearLabel(academicYears, item.academicYearId)}
												</td>
												<td className="px-4 py-4">{getTypeLabel(item.type)}</td>
												<td className="px-4 py-4">
													{item.startDate} → {item.endDate}
												</td>
												<td className="px-4 py-4">
													<span className="inline-flex w-fit items-center rounded border px-2.5 py-1 text-xs">
														{getStatusLabel(item.status)}
													</span>
												</td>
												<td className="px-4 py-4">{formatDateTime(item.createdAt)}</td>
												<td className="px-4 py-4 text-right">
													{canUpdate ? (
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() =>
																navigate({
																	to: "/semesters/$semesterId/edit",
																	params: { semesterId: String(item.id) },
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
