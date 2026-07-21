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
	ACADEMIC_YEAR_STATUS_OPTIONS,
	type AcademicYearStatus,
} from "@/components/academic-year-form";
import { AppShell } from "@/components/app-shell";
import { PaginationControls } from "@/components/pagination-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/academic-years")({
	component: AcademicYearsRoute,
});

type AcademicYearItem = {
	id: number;
	code: string;
	name: string;
	startDate: string;
	endDate: string;
	status: AcademicYearStatus;
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

function getStatusLabel(status: AcademicYearStatus) {
	return (
		ACADEMIC_YEAR_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
		status
	);
}

function AcademicYearsRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/academic-years/");
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
	const canRead = hasPermission(permissionMap, "academic-years", "read");
	const canCreate = hasPermission(permissionMap, "academic-years", "create");
	const canUpdate = hasPermission(permissionMap, "academic-years", "update");
	const canDelete = hasPermission(permissionMap, "academic-years", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedAcademicYearIds, setSelectedAcademicYearIds] = useState<number[]>([]);

	const academicYearsQuery = useQuery({
		...orpc["academicYears.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as AcademicYearStatus) : undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const academicYears = (academicYearsQuery.data?.academicYears ??
		[]) as AcademicYearItem[];
	const pagination = academicYearsQuery.data?.pagination;
	const selectedAcademicYearIdSet = useMemo(
		() => new Set(selectedAcademicYearIds),
		[selectedAcademicYearIds],
	);
	const currentPageAcademicYearIds = useMemo(
		() => academicYears.map((item) => item.id),
		[academicYears],
	);
	const hasVisibleAcademicYears = currentPageAcademicYearIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleAcademicYears &&
		currentPageAcademicYearIds.every((id) => selectedAcademicYearIdSet.has(id));

	useEffect(() => {
		setSelectedAcademicYearIds((currentIds) => {
			const nextIds = currentIds.filter((id) =>
				currentPageAcademicYearIds.includes(id),
			);
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageAcademicYearIds]);

	const deleteAcademicYearMutation = useMutation(
		orpc["academicYears.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} năm học`);
				setSelectedAcademicYearIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedAcademicYearIds(
			isAllCurrentPageSelected ? [] : currentPageAcademicYearIds,
		);
	};

	const toggleSelectAcademicYear = (academicYearId: number) => {
		setSelectedAcademicYearIds((currentIds) =>
			currentIds.includes(academicYearId)
				? currentIds.filter((id) => id !== academicYearId)
				: [...currentIds, academicYearId],
		);
	};

	const handleDeleteSelectedAcademicYears = () => {
		if (selectedAcademicYearIds.length === 0) return;
		if (!confirm(`Xóa ${selectedAcademicYearIds.length} năm học đã chọn?`)) return;
		deleteAcademicYearMutation.mutate({
			academicYearIds: selectedAcademicYearIds,
		});
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
				pageTitle="Quản lý năm học"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý năm học."
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
			pageTitle="Quản lý năm học"
			pageDescription="Quản lý mốc thời gian, trạng thái mở/khóa và vòng đời năm học."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-bold">Danh sách năm học</CardTitle>
							<CardDescription>
								Tìm theo mã/tên năm học và lọc theo trạng thái.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							{canDelete && selectedAcademicYearIds.length > 0 ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteSelectedAcademicYears}
									disabled={deleteAcademicYearMutation.isPending}
								>
									<Trash2 data-icon="inline-start" />
									Xóa {selectedAcademicYearIds.length} năm học
								</Button>
							) : null}
							{canCreate ? (
								<Button
									type="button"
									onClick={() => navigate({ to: "/academic-years/create" })}
								>
									<Plus data-icon="inline-start" />
									Thêm năm học
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="academic-year-search">Tìm kiếm</Label>
							<Input
								id="academic-year-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Tìm theo mã hoặc tên năm học"
							/>
						</div>
						<div className="flex flex-col gap-2 md:max-w-xs">
							<Label htmlFor="academic-year-filter-status">Trạng thái</Label>
							<select
								id="academic-year-filter-status"
								className="h-9 border bg-background px-3 text-sm"
								value={statusFilter}
								onChange={(event) => {
									setStatusFilter(event.target.value);
									setPage(1);
								}}
							>
								<option value="">Tất cả</option>
								{ACADEMIC_YEAR_STATUS_OPTIONS.map((item) => (
									<option key={item.value} value={item.value}>
										{item.label}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="overflow-hidden border">
						<div className="max-h-[31rem] overflow-y-auto">
							<table className="w-full table-fixed text-[15px]">
								<colgroup>
									<col className="w-12" />
									<col />
									<col className="w-56" />
									<col className="w-40" />
									<col className="w-48" />
									<col className="w-32" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="w-12 px-4 py-3">
											<input
												type="checkbox"
												aria-label="Chọn tất cả năm học trên trang hiện tại"
												checked={isAllCurrentPageSelected}
												disabled={!hasVisibleAcademicYears}
												onChange={toggleSelectAllCurrentPage}
											/>
										</th>
										<th className="px-4 py-3 font-medium">Năm học</th>
										<th className="px-4 py-3 font-medium">Thời gian</th>
										<th className="px-4 py-3 font-medium">Trạng thái</th>
										<th className="px-4 py-3 font-medium">Ngày tạo</th>
										<th className="px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{academicYearsQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={6} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : academicYearsQuery.error ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách năm học.
											</td>
										</tr>
									) : academicYears.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy năm học phù hợp.
											</td>
										</tr>
									) : (
										academicYears.map((item) => (
											<tr key={item.id} className="border-t hover:bg-muted/40">
												<td className="px-4 py-4">
													<input
														type="checkbox"
														aria-label={`Chọn năm học ${item.code}`}
														checked={selectedAcademicYearIdSet.has(item.id)}
														onChange={() => toggleSelectAcademicYear(item.id)}
													/>
												</td>
												<td className="px-4 py-4">
													<div className="truncate font-medium">{item.name}</div>
													<div className="text-muted-foreground text-xs">{item.code}</div>
												</td>
												<td className="px-4 py-4">
													{item.startDate} → {item.endDate}
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
																	to: "/academic-years/$academicYearId/edit",
																	params: { academicYearId: String(item.id) },
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
