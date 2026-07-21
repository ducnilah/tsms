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

import {
	HOLIDAY_STATUS_OPTIONS,
	HOLIDAY_TYPE_OPTIONS,
	type HolidayStatus,
	type HolidayType,
	type SemesterOption,
} from "@/components/academic-holiday-form";
import { AppShell } from "@/components/app-shell";
import { PaginationControls } from "@/components/pagination-controls";
import { type AcademicYearOption } from "@/components/semester-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/academic-holidays")({
	component: AcademicHolidaysRoute,
});

type AcademicHolidayItem = {
	id: number;
	academicYearId: number;
	semesterId: number | null;
	name: string;
	type: HolidayType;
	startDate: string;
	endDate: string;
	status: HolidayStatus;
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

function getHolidayTypeLabel(type: HolidayType) {
	return HOLIDAY_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

function getHolidayStatusLabel(status: HolidayStatus) {
	return HOLIDAY_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function getAcademicYearLabel(academicYears: AcademicYearOption[], academicYearId: number) {
	const academicYear = academicYears.find((item) => item.id === academicYearId);
	return academicYear ? `${academicYear.name} (${academicYear.code})` : "Chưa rõ năm học";
}

function getSemesterLabel(semesters: SemesterOption[], semesterId: number | null) {
	if (!semesterId) return "Toàn năm học";
	const semester = semesters.find((item) => item.id === semesterId);
	return semester ? `${semester.name} (${semester.code})` : "Chưa rõ học kỳ";
}

function AcademicHolidaysRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/academic-holidays/");
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
	const canRead = hasPermission(permissionMap, "academic-holidays", "read");
	const canCreate = hasPermission(permissionMap, "academic-holidays", "create");
	const canUpdate = hasPermission(permissionMap, "academic-holidays", "update");
	const canDelete = hasPermission(permissionMap, "academic-holidays", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [academicYearFilterId, setAcademicYearFilterId] = useState(0);
	const [semesterFilterId, setSemesterFilterId] = useState(0);
	const [typeFilter, setTypeFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedHolidayIds, setSelectedHolidayIds] = useState<number[]>([]);

	const holidaysQuery = useQuery({
		...orpc["academicHolidays.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				academicYearId: academicYearFilterId || undefined,
				semesterId: semesterFilterId || undefined,
				type: typeFilter ? (typeFilter as HolidayType) : undefined,
				status: statusFilter ? (statusFilter as HolidayStatus) : undefined,
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

	const semestersQuery = useQuery({
		...orpc["semesters.options"].queryOptions(),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const holidays = (holidaysQuery.data?.holidays ?? []) as AcademicHolidayItem[];
	const academicYears = (academicYearsQuery.data?.academicYears ??
		[]) as AcademicYearOption[];
	const semesters = (semestersQuery.data?.semesters ?? []) as SemesterOption[];
	const filteredSemesters = academicYearFilterId
		? semesters.filter((item) => item.academicYearId === academicYearFilterId)
		: semesters;
	const pagination = holidaysQuery.data?.pagination;
	const selectedHolidayIdSet = useMemo(
		() => new Set(selectedHolidayIds),
		[selectedHolidayIds],
	);
	const currentPageHolidayIds = useMemo(
		() => holidays.map((item) => item.id),
		[holidays],
	);
	const hasVisibleHolidays = currentPageHolidayIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleHolidays &&
		currentPageHolidayIds.every((id) => selectedHolidayIdSet.has(id));

	useEffect(() => {
		setSelectedHolidayIds((currentIds) => {
			const nextIds = currentIds.filter((id) => currentPageHolidayIds.includes(id));
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageHolidayIds]);

	const deleteHolidayMutation = useMutation(
		orpc["academicHolidays.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} ngày nghỉ/lễ`);
				setSelectedHolidayIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedHolidayIds(isAllCurrentPageSelected ? [] : currentPageHolidayIds);
	};

	const toggleSelectHoliday = (holidayId: number) => {
		setSelectedHolidayIds((currentIds) =>
			currentIds.includes(holidayId)
				? currentIds.filter((id) => id !== holidayId)
				: [...currentIds, holidayId],
		);
	};

	const handleDeleteSelectedHolidays = () => {
		if (selectedHolidayIds.length === 0) return;
		if (!confirm(`Xóa ${selectedHolidayIds.length} ngày nghỉ/lễ đã chọn?`)) return;
		deleteHolidayMutation.mutate({ holidayIds: selectedHolidayIds });
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
				pageTitle="Quản lý ngày nghỉ/lễ"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý ngày nghỉ/lễ."
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
			pageTitle="Quản lý ngày nghỉ/lễ"
			pageDescription="Quản lý nghỉ lễ, sự kiện, tuần thi hoặc mốc nghỉ theo năm học và học kỳ."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-bold">Danh sách ngày nghỉ/lễ</CardTitle>
							<CardDescription>
								Tìm theo tên và lọc theo năm học, học kỳ, loại mốc, trạng thái.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							{canDelete && selectedHolidayIds.length > 0 ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteSelectedHolidays}
									disabled={deleteHolidayMutation.isPending}
								>
									<Trash2 data-icon="inline-start" />
									Xóa {selectedHolidayIds.length} ngày nghỉ/lễ
								</Button>
							) : null}
							{canCreate ? (
								<Button
									type="button"
									onClick={() => navigate({ to: "/academic-holidays/create" })}
								>
									<Plus data-icon="inline-start" />
									Thêm ngày nghỉ/lễ
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="academic-holiday-search">Tìm kiếm</Label>
							<Input
								id="academic-holiday-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Tìm theo tên ngày nghỉ/lễ"
							/>
						</div>
						<div className="grid gap-3 md:grid-cols-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="academic-holiday-filter-year">Năm học</Label>
								<select
									id="academic-holiday-filter-year"
									className="h-9 border bg-background px-3 text-sm"
									value={academicYearFilterId}
									onChange={(event) => {
										setAcademicYearFilterId(Number(event.target.value));
										setSemesterFilterId(0);
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
								<Label htmlFor="academic-holiday-filter-semester">Học kỳ</Label>
								<select
									id="academic-holiday-filter-semester"
									className="h-9 border bg-background px-3 text-sm"
									value={semesterFilterId}
									onChange={(event) => {
										setSemesterFilterId(Number(event.target.value));
										setPage(1);
									}}
								>
									<option value={0}>Tất cả</option>
									{filteredSemesters.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name} ({item.code})
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="academic-holiday-filter-type">Loại</Label>
								<select
									id="academic-holiday-filter-type"
									className="h-9 border bg-background px-3 text-sm"
									value={typeFilter}
									onChange={(event) => {
										setTypeFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả</option>
									{HOLIDAY_TYPE_OPTIONS.map((item) => (
										<option key={item.value} value={item.value}>
											{item.label}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="academic-holiday-filter-status">Trạng thái</Label>
								<select
									id="academic-holiday-filter-status"
									className="h-9 border bg-background px-3 text-sm"
									value={statusFilter}
									onChange={(event) => {
										setStatusFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả</option>
									{HOLIDAY_STATUS_OPTIONS.map((item) => (
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
									<col className="w-44" />
									<col className="w-52" />
									<col className="w-44" />
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
												aria-label="Chọn tất cả ngày nghỉ/lễ trên trang hiện tại"
												checked={isAllCurrentPageSelected}
												disabled={!hasVisibleHolidays}
												onChange={toggleSelectAllCurrentPage}
											/>
										</th>
										<th className="px-4 py-3 font-medium">Tên mốc</th>
										<th className="px-4 py-3 font-medium">Loại</th>
										<th className="px-4 py-3 font-medium">Năm học</th>
										<th className="px-4 py-3 font-medium">Học kỳ</th>
										<th className="px-4 py-3 font-medium">Thời gian</th>
										<th className="px-4 py-3 font-medium">Trạng thái</th>
										<th className="px-4 py-3 font-medium">Ngày tạo</th>
										<th className="px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{holidaysQuery.isLoading ||
									academicYearsQuery.isLoading ||
									semestersQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={9} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : holidaysQuery.error ||
									  academicYearsQuery.error ||
									  semestersQuery.error ? (
										<tr>
											<td colSpan={9} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách ngày nghỉ/lễ.
											</td>
										</tr>
									) : holidays.length === 0 ? (
										<tr>
											<td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy ngày nghỉ/lễ phù hợp.
											</td>
										</tr>
									) : (
										holidays.map((item) => (
											<tr key={item.id} className="border-t hover:bg-muted/40">
												<td className="px-4 py-4">
													<input
														type="checkbox"
														aria-label={`Chọn ngày nghỉ/lễ ${item.name}`}
														checked={selectedHolidayIdSet.has(item.id)}
														onChange={() => toggleSelectHoliday(item.id)}
													/>
												</td>
												<td className="px-4 py-4 font-medium">{item.name}</td>
												<td className="px-4 py-4">{getHolidayTypeLabel(item.type)}</td>
												<td className="px-4 py-4">
													{getAcademicYearLabel(academicYears, item.academicYearId)}
												</td>
												<td className="px-4 py-4">
													{getSemesterLabel(semesters, item.semesterId)}
												</td>
												<td className="px-4 py-4">
													{item.startDate} → {item.endDate}
												</td>
												<td className="px-4 py-4">
													<span className="inline-flex w-fit items-center rounded border px-2.5 py-1 text-xs">
														{getHolidayStatusLabel(item.status)}
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
																	to: "/academic-holidays/$academicHolidayId/edit",
																	params: { academicHolidayId: String(item.id) },
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
