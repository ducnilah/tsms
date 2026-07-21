import { useQuery } from "@tanstack/react-query";
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
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PaginationControls } from "@/components/pagination-controls";
import { type AcademicYearOption } from "@/components/semester-form";
import { orpc } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/academic-weeks")({
	component: AcademicWeeksRoute,
});

type SemesterOption = {
	id: number;
	academicYearId: number;
	code: string;
	name: string;
};

type AcademicWeekItem = {
	id: number;
	semesterId: number;
	semesterCode: string;
	semesterName: string;
	academicYearId: number;
	weekNumber: number;
	startDate: string;
	endDate: string;
	isTeachingWeek: boolean;
	note: string;
	updatedAt?: string | Date;
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

function AcademicWeeksRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/academic-weeks/");
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
	const canRead = hasPermission(permissionMap, "semester-weeks", "read");
	const canUpdate = hasPermission(permissionMap, "semester-weeks", "update");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [academicYearFilterId, setAcademicYearFilterId] = useState(0);
	const [semesterFilterId, setSemesterFilterId] = useState(0);
	const [teachingWeekFilter, setTeachingWeekFilter] = useState("");

	const weeksQuery = useQuery({
		...orpc["academicWeeks.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				academicYearId: academicYearFilterId || undefined,
				semesterId: semesterFilterId || undefined,
				isTeachingWeek:
					teachingWeekFilter === ""
						? undefined
						: teachingWeekFilter === "teaching",
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

	const weeks = (weeksQuery.data?.weeks ?? []) as AcademicWeekItem[];
	const academicYears = (academicYearsQuery.data?.academicYears ??
		[]) as AcademicYearOption[];
	const semesters = (semestersQuery.data?.semesters ?? []) as SemesterOption[];
	const filteredSemesters = academicYearFilterId
		? semesters.filter((item) => item.academicYearId === academicYearFilterId)
		: semesters;
	const pagination = weeksQuery.data?.pagination;

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
				pageTitle="Quản lý tuần học"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý tuần học."
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
			pageTitle="Quản lý tuần học"
			pageDescription="Theo dõi tuần học theo học kỳ, đánh dấu tuần học hoặc tuần nghỉ/không học."
		>
			<Card>
				<CardHeader>
					<CardTitle className="text-lg font-bold">Danh sách tuần học</CardTitle>
					<CardDescription>
						Tìm theo ghi chú/học kỳ và lọc theo năm học, học kỳ, trạng thái tuần.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="academic-week-search">Tìm kiếm</Label>
							<Input
								id="academic-week-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Tìm theo ghi chú, mã hoặc tên học kỳ"
							/>
						</div>
						<div className="grid gap-3 md:grid-cols-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="academic-week-filter-year">Năm học</Label>
								<select
									id="academic-week-filter-year"
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
								<Label htmlFor="academic-week-filter-semester">Học kỳ</Label>
								<select
									id="academic-week-filter-semester"
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
								<Label htmlFor="academic-week-filter-status">Trạng thái tuần</Label>
								<select
									id="academic-week-filter-status"
									className="h-9 border bg-background px-3 text-sm"
									value={teachingWeekFilter}
									onChange={(event) => {
										setTeachingWeekFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả</option>
									<option value="teaching">Tuần học</option>
									<option value="off">Nghỉ/không học</option>
								</select>
							</div>
						</div>
					</div>

					<div className="overflow-hidden border">
						<div className="max-h-[31rem] overflow-y-auto">
							<table className="w-full table-fixed text-[15px]">
								<colgroup>
									<col className="w-28" />
									<col />
									<col className="w-52" />
									<col className="w-40" />
									<col />
									<col className="w-48" />
									<col className="w-32" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="px-4 py-3 font-medium">Tuần</th>
										<th className="px-4 py-3 font-medium">Học kỳ</th>
										<th className="px-4 py-3 font-medium">Thời gian</th>
										<th className="px-4 py-3 font-medium">Trạng thái</th>
										<th className="px-4 py-3 font-medium">Ghi chú</th>
										<th className="px-4 py-3 font-medium">Cập nhật</th>
										<th className="px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{weeksQuery.isLoading ||
									academicYearsQuery.isLoading ||
									semestersQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={7} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : weeksQuery.error ||
									  academicYearsQuery.error ||
									  semestersQuery.error ? (
										<tr>
											<td colSpan={7} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách tuần học.
											</td>
										</tr>
									) : weeks.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy tuần học phù hợp.
											</td>
										</tr>
									) : (
										weeks.map((item) => (
											<tr key={item.id} className="border-t hover:bg-muted/40">
												<td className="px-4 py-4 font-medium">Tuần {item.weekNumber}</td>
												<td className="px-4 py-4">
													<div className="font-medium">{item.semesterName}</div>
													<div className="text-muted-foreground text-xs">
														{item.semesterCode}
													</div>
												</td>
												<td className="px-4 py-4">
													{item.startDate} → {item.endDate}
												</td>
												<td className="px-4 py-4">
													<span className="inline-flex w-fit items-center rounded border px-2.5 py-1 text-xs">
														{item.isTeachingWeek ? "Tuần học" : "Nghỉ/không học"}
													</span>
												</td>
												<td className="px-4 py-4">{item.note || "Không có ghi chú"}</td>
												<td className="px-4 py-4">{formatDateTime(item.updatedAt)}</td>
												<td className="px-4 py-4 text-right">
													{canUpdate ? (
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() =>
																navigate({
																	to: "/academic-weeks/$academicWeekId/edit",
																	params: { academicWeekId: String(item.id) },
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
