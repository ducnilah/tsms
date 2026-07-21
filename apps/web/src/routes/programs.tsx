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
import { BookOpen, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PaginationControls } from "@/components/pagination-controls";
import { type ProgramMajorOption, type ProgramStatus } from "@/components/program-form";
import { orpc } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/programs")({
	validateSearch: (search: Record<string, unknown>) => {
		const majorId = Number(search.majorId);

		return {
			majorId: Number.isInteger(majorId) && majorId > 0 ? majorId : undefined,
		};
	},
	component: ProgramsRoute,
});

type ProgramItem = {
	id: number;
	majorId: number;
	code: string;
	name: string;
	academicYear: string;
	version: number;
	status: ProgramStatus;
};

function getStatusLabel(status: ProgramStatus) {
	return status === "active" ? "Đang hoạt động" : "Ngừng hoạt động";
}

function ProgramsRoute() {
	const navigate = useNavigate();
	const searchParams = Route.useSearch();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/programs/");
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
	const canRead = hasPermission(permissionMap, "programs", "read");
	const canCreate = hasPermission(permissionMap, "programs", "create");
	const canUpdate = hasPermission(permissionMap, "programs", "update");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [majorFilterId, setMajorFilterId] = useState(searchParams.majorId ?? 0);
	const [academicYearFilter, setAcademicYearFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");

	useEffect(() => {
		setMajorFilterId(searchParams.majorId ?? 0);
		setPage(1);
	}, [searchParams.majorId]);

	const programsQuery = useQuery({
		...orpc["programs.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				majorId: majorFilterId || undefined,
				academicYear: academicYearFilter.trim() || undefined,
				status: statusFilter ? (statusFilter as ProgramStatus) : undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const majorsQuery = useQuery({
		...orpc["majors.options"].queryOptions(),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const programs = (programsQuery.data?.programs ?? []) as ProgramItem[];
	const majors = (majorsQuery.data?.majors ?? []) as ProgramMajorOption[];
	const pagination = programsQuery.data?.pagination;
	const getMajorName = (majorId: number) =>
		majors.find((item) => item.id === majorId)?.name ?? "Không xác định";

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
				pageTitle="Quản lý chương trình đào tạo"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý chương trình đào tạo."
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
			pageTitle="Quản lý chương trình đào tạo"
			pageDescription="Theo dõi chương trình theo ngành, khóa học và trạng thái sử dụng."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-bold">
								Danh sách chương trình đào tạo
							</CardTitle>
							<CardDescription>
								Tìm theo mã/tên chương trình và lọc theo ngành, khóa, trạng thái.
							</CardDescription>
						</div>
						{canCreate ? (
							<Button
								type="button"
								onClick={() =>
									navigate({
										to: "/programs/create",
										search: { majorId: undefined },
									})
								}
							>
								<Plus data-icon="inline-start" />
								Thêm chương trình
							</Button>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="program-search">Tìm kiếm</Label>
							<Input
								id="program-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Nhập mã hoặc tên chương trình"
							/>
						</div>
						<div className="grid gap-3 md:grid-cols-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="program-filter-major">Ngành</Label>
								<select
									id="program-filter-major"
									className="h-9 border bg-background px-3 text-sm"
									value={majorFilterId}
									onChange={(event) => {
										setMajorFilterId(Number(event.target.value));
										setPage(1);
									}}
								>
									<option value={0}>Tất cả ngành</option>
									{majors.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name} ({item.code})
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="program-filter-year">Khóa học</Label>
								<Input
									id="program-filter-year"
									value={academicYearFilter}
									onChange={(event) => {
										setAcademicYearFilter(event.target.value);
										setPage(1);
									}}
									placeholder="Ví dụ: 2024"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="program-filter-status">Trạng thái</Label>
								<select
									id="program-filter-status"
									className="h-9 border bg-background px-3 text-sm"
									value={statusFilter}
									onChange={(event) => {
										setStatusFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả trạng thái</option>
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
									<col className="w-64" />
									<col className="w-64" />
									<col className="w-32" />
									<col className="w-40" />
									<col className="w-64" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="px-4 py-3 font-medium">Chương trình</th>
										<th className="px-4 py-3 font-medium">Ngành</th>
										<th className="px-4 py-3 font-medium">Khóa</th>
										<th className="px-4 py-3 translate-x-4 font-medium">Trạng thái</th>
										<th className="px-4 py-3 -translate-x-15 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{programsQuery.isLoading || majorsQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={5} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : programsQuery.error || majorsQuery.error ? (
										<tr>
											<td colSpan={5} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách chương trình đào tạo.
											</td>
										</tr>
									) : programs.length === 0 ? (
										<tr>
											<td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy chương trình đào tạo phù hợp.
											</td>
										</tr>
									) : (
										programs.map((item) => (
											<tr key={item.id} className="border-t hover:bg-muted/40">
												<td className="px-4 py-4">
													<div className="font-medium">{item.name}</div>
													<div className="text-muted-foreground text-xs">
														{item.code} - phiên bản {item.version}
													</div>
												</td>
												<td className="px-4 py-4">{getMajorName(item.majorId)}</td>
												<td className="px-4 py-4">{item.academicYear}</td>
												<td className="px-4 py-4">
													<span className="inline-flex w-fit items-center rounded border px-2.5 py-1 text-xs">
														{getStatusLabel(item.status)}
													</span>
												</td>
												<td className="px-4 py-4">
													{canUpdate ? (
														<div className="flex justify-end gap-2">
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={() =>
																	navigate({
																		to: "/programs/$programId/edit",
																		params: { programId: String(item.id) },
																		search: { majorId: undefined },
																	})
																}
															>
																<Pencil data-icon="inline-start" />
																Thông tin
															</Button>
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={() =>
																	navigate({
																		to: "/programs/$programId/courses",
																		params: { programId: String(item.id) },
																		search: { majorId: undefined },
																	})
																}
															>
																<BookOpen data-icon="inline-start" />
																Học phần
															</Button>
														</div>
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
