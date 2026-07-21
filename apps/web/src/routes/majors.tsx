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
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/majors")({
	component: MajorsRoute,
});

type MajorStatus = "active" | "inactive";

type MajorItem = {
	id: number;
	name: string;
	code: string;
	facultyId: number;
	description: string | null;
	status: MajorStatus;
	programCount: number;
	createdAt?: string | Date;
};

type FacultyOption = {
	id: number;
	code: string;
	name: string;
	status: MajorStatus;
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

function getStatusLabel(status: MajorStatus) {
	return status === "active" ? "Đang hoạt động" : "Ngừng hoạt động";
}

function MajorsRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/majors/");

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
	const canCreate = hasPermission(permissionMap, "majors", "create");
	const canUpdate = hasPermission(permissionMap, "majors", "update");
	const canDelete = hasPermission(permissionMap, "majors", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [facultyFilterId, setFacultyFilterId] = useState(0);
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedMajorIds, setSelectedMajorIds] = useState<number[]>([]);

	const majorsQuery = useQuery({
		...orpc["majors.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				facultyId: facultyFilterId || undefined,
				status: statusFilter ? (statusFilter as MajorStatus) : undefined,
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

	const majors = (majorsQuery.data?.majors ?? []) as MajorItem[];
	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];
	const pagination = majorsQuery.data?.pagination;
	const facultyById = useMemo(
		() => new Map(faculties.map((item) => [item.id, item])),
		[faculties],
	);
	const selectedMajorIdSet = useMemo(
		() => new Set(selectedMajorIds),
		[selectedMajorIds],
	);
	const currentPageMajorIds = useMemo(
		() => majors.map((item) => item.id),
		[majors],
	);
	const hasVisibleMajors = currentPageMajorIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleMajors && currentPageMajorIds.every((id) => selectedMajorIdSet.has(id));

	useEffect(() => {
		setSelectedMajorIds((currentIds) => {
			const nextIds = currentIds.filter((id) => currentPageMajorIds.includes(id));
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageMajorIds]);

	const deleteMajorMutation = useMutation(
		orpc["majors.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} ngành học`);
				setSelectedMajorIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedMajorIds(isAllCurrentPageSelected ? [] : currentPageMajorIds);
	};

	const toggleSelectMajor = (majorId: number) => {
		setSelectedMajorIds((currentIds) =>
			currentIds.includes(majorId)
				? currentIds.filter((id) => id !== majorId)
				: [...currentIds, majorId],
		);
	};

	const handleDeleteSelectedMajors = () => {
		if (selectedMajorIds.length === 0) return;
		if (!confirm(`Xóa ${selectedMajorIds.length} ngành học đã chọn?`)) return;
		deleteMajorMutation.mutate({ majorIds: selectedMajorIds });
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
				pageTitle="Quản lý ngành học"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý ngành học."
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
			pageTitle="Quản lý ngành học"
			pageDescription="Quản lý ngành đào tạo, khoa phụ trách và các chương trình đào tạo thuộc ngành."
		>
			<Card>
					<CardHeader>
						<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
							<div>
								<CardTitle className="text-lg font-bold">Danh sách ngành học</CardTitle>
								<CardDescription>
									Tìm kiếm, lọc và quản lý thông tin ngành học theo khoa.
								</CardDescription>
							</div>
							<div className="flex flex-wrap gap-2">
								{canDelete && selectedMajorIds.length > 0 ? (
									<Button
										type="button"
										variant="destructive"
										onClick={handleDeleteSelectedMajors}
										disabled={deleteMajorMutation.isPending}
									>
										<Trash2 data-icon="inline-start" />
										Xóa {selectedMajorIds.length} ngành học
									</Button>
								) : null}
								{canCreate ? (
									<Button type="button" onClick={() => navigate({ to: "/majors/create" })}>
										<Plus data-icon="inline-start" />
										Thêm ngành học
									</Button>
								) : null}
							</div>
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="flex flex-col gap-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="major-search">Tìm kiếm</Label>
								<Input
									id="major-search"
									value={search}
									onChange={(event) => {
										setSearch(event.target.value);
										setPage(1);
									}}
									placeholder="Tìm theo mã ngành hoặc tên ngành"
								/>
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="major-filter-faculty">Khoa quản lý</Label>
									<select
										id="major-filter-faculty"
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
									<Label htmlFor="major-filter-status">Trạng thái</Label>
									<select
										id="major-filter-status"
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
										<col className="w-30" />
										<col className="w-50" />
										<col className="w-54" />
										<col className="w-34" />
										<col className="w-40" />
										<col className="w-22" />
									</colgroup>
									<thead className="sticky top-0 z-10 bg-muted text-left">
										<tr>
											<th className="w-12 px-4 py-3">
												<input
													type="checkbox"
													aria-label="Chọn tất cả ngành trên trang hiện tại"
													checked={isAllCurrentPageSelected}
													disabled={!hasVisibleMajors}
													onChange={toggleSelectAllCurrentPage}
												/>
											</th>
											<th className="px-4 py-3 font-medium">Mã ngành</th>
											<th className="px-4 py-3 font-medium">Tên ngành</th>
											<th className="px-4 py-3 font-medium">Khoa quản lý</th>
											<th className="px-4 py-3 text-center font-medium">CTĐT</th>
											<th className="px-4 py-3 translate-x-4 font-medium">Trạng thái</th>
											<th className="px-4 py-3 text-right font-medium">Thao tác</th>
										</tr>
									</thead>
									<tbody>
										{majorsQuery.isLoading || facultiesQuery.isLoading ? (
											Array.from({ length: 8 }).map((_, index) => (
												<tr key={index} className="border-t">
													<td colSpan={7} className="px-4 py-4">
														<Skeleton className="h-6 w-full" />
													</td>
												</tr>
											))
										) : majorsQuery.error || facultiesQuery.error ? (
											<tr>
												<td colSpan={7} className="px-4 py-10 text-center text-destructive">
													Không thể tải danh sách ngành học.
												</td>
											</tr>
										) : majors.length === 0 ? (
											<tr>
												<td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
													Không tìm thấy ngành học phù hợp.
												</td>
											</tr>
										) : (
											majors.map((item) => {
												const facultyItem = facultyById.get(item.facultyId);

												return (
													<tr key={item.id} className="border-t hover:bg-muted/40">
														<td className="px-4 py-4">
															<input
																type="checkbox"
																aria-label={`Chọn ngành ${item.name}`}
																checked={selectedMajorIdSet.has(item.id)}
																onChange={() => toggleSelectMajor(item.id)}
															/>
														</td>
														<td className="px-4 py-4 font-medium">{item.code}</td>
														<td className="px-4 py-4">
															<div className="truncate font-medium">{item.name}</div>
															<div className="text-muted-foreground text-xs">
																Tạo: {formatDate(item.createdAt)}
															</div>
														</td>
														<td className="px-4 py-4">
															<div className="truncate">
																{facultyItem?.name ?? "Không xác định"}
															</div>
															<div className="text-muted-foreground text-xs">
																{facultyItem?.code ?? `ID ${item.facultyId}`}
															</div>
														</td>
														<td className="px-4 py-4 text-center">{item.programCount}</td>
														<td className="px-4 py-4">
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
																	onClick={(event) => {
																		event.stopPropagation();
																		navigate({
																			to: "/majors/$majorId/edit",
																			params: { majorId: String(item.id) },
																		});
																	}}
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
