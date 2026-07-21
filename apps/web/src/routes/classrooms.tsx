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
	CLASSROOM_TYPE_OPTIONS,
	type ClassroomType,
} from "@/components/classroom-form";
import { AppShell } from "@/components/app-shell";
import { PaginationControls } from "@/components/pagination-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/classrooms")({
	component: ClassroomsRoute,
});

type ClassroomStatus = "active" | "inactive";

type ClassroomItem = {
	id: number;
	code: string;
	buildingId: number;
	capacity: number;
	type: ClassroomType;
	status: ClassroomStatus;
	createdAt?: string | Date;
};

type BuildingOption = {
	id: number;
	code: string;
	status: ClassroomStatus;
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

function getStatusLabel(status: ClassroomStatus) {
	return status === "active" ? "Đang hoạt động" : "Ngừng hoạt động";
}

function getTypeLabel(type: ClassroomType) {
	return CLASSROOM_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

function ClassroomsRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/classrooms/");
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
	const canRead = hasPermission(permissionMap, "classrooms", "read");
	const canCreate = hasPermission(permissionMap, "classrooms", "create");
	const canUpdate = hasPermission(permissionMap, "classrooms", "update");
	const canDelete = hasPermission(permissionMap, "classrooms", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [typeFilter, setTypeFilter] = useState("");
	const [buildingFilterId, setBuildingFilterId] = useState(0);
	const [selectedClassroomIds, setSelectedClassroomIds] = useState<number[]>([]);

	const classroomsQuery = useQuery({
		...orpc["classrooms.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as ClassroomStatus) : undefined,
				type: typeFilter ? (typeFilter as ClassroomType) : undefined,
				buildingId: buildingFilterId || undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const buildingsQuery = useQuery({
		...orpc["buildings.options"].queryOptions(),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const classrooms = (classroomsQuery.data?.classrooms ?? []) as ClassroomItem[];
	const buildings = (buildingsQuery.data?.buildings ?? []) as BuildingOption[];
	const pagination = classroomsQuery.data?.pagination;
	const buildingById = useMemo(
		() => new Map(buildings.map((item) => [item.id, item])),
		[buildings],
	);
	const selectedClassroomIdSet = useMemo(
		() => new Set(selectedClassroomIds),
		[selectedClassroomIds],
	);
	const currentPageClassroomIds = useMemo(
		() => classrooms.map((item) => item.id),
		[classrooms],
	);
	const hasVisibleClassrooms = currentPageClassroomIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleClassrooms &&
		currentPageClassroomIds.every((id) => selectedClassroomIdSet.has(id));

	useEffect(() => {
		setSelectedClassroomIds((currentIds) => {
			const nextIds = currentIds.filter((id) =>
				currentPageClassroomIds.includes(id),
			);
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageClassroomIds]);

	const deleteClassroomMutation = useMutation(
		orpc["classrooms.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} phòng học`);
				setSelectedClassroomIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedClassroomIds(
			isAllCurrentPageSelected ? [] : currentPageClassroomIds,
		);
	};

	const toggleSelectClassroom = (classroomId: number) => {
		setSelectedClassroomIds((currentIds) =>
			currentIds.includes(classroomId)
				? currentIds.filter((id) => id !== classroomId)
				: [...currentIds, classroomId],
		);
	};

	const handleDeleteSelectedClassrooms = () => {
		if (selectedClassroomIds.length === 0) return;
		if (!confirm(`Xóa ${selectedClassroomIds.length} phòng học đã chọn?`)) return;
		deleteClassroomMutation.mutate({ classroomIds: selectedClassroomIds });
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
				pageTitle="Quản lý phòng học"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý phòng học."
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
			pageTitle="Quản lý phòng học"
			pageDescription="Theo dõi phòng học theo tòa nhà, loại phòng, sức chứa và trạng thái."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-bold">Danh sách phòng học</CardTitle>
							<CardDescription>
								Tìm kiếm, lọc theo tòa nhà/loại phòng và thao tác chỉnh sửa.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							{canDelete && selectedClassroomIds.length > 0 ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteSelectedClassrooms}
									disabled={deleteClassroomMutation.isPending}
								>
									<Trash2 data-icon="inline-start" />
									Xóa {selectedClassroomIds.length} phòng học
								</Button>
							) : null}
							{canCreate ? (
								<Button type="button" onClick={() => navigate({ to: "/classrooms/create" })}>
									<Plus data-icon="inline-start" />
									Thêm phòng học
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="classroom-search">Tìm kiếm</Label>
							<Input
								id="classroom-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Tìm theo mã phòng"
							/>
						</div>
						<div className="grid gap-3 md:grid-cols-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="classroom-filter-building">Tòa nhà</Label>
								<select
									id="classroom-filter-building"
									className="h-9 border bg-background px-3 text-sm"
									value={buildingFilterId}
									onChange={(event) => {
										setBuildingFilterId(Number(event.target.value));
										setPage(1);
									}}
								>
									<option value={0}>Tất cả tòa nhà</option>
									{buildings.map((item) => (
										<option key={item.id} value={item.id}>
											{item.code}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="classroom-filter-type">Loại phòng</Label>
								<select
									id="classroom-filter-type"
									className="h-9 border bg-background px-3 text-sm"
									value={typeFilter}
									onChange={(event) => {
										setTypeFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả loại phòng</option>
									{CLASSROOM_TYPE_OPTIONS.map((item) => (
										<option key={item.value} value={item.value}>
											{item.label}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="classroom-filter-status">Trạng thái</Label>
								<select
									id="classroom-filter-status"
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
									<col className="w-44" />
									<col className="w-32" />
									<col className="w-36" />
									<col className="w-28" />
									<col className="w-40" />
									<col className="w-40"/>
									<col className="w-32" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="w-12 px-4 py-3">
											<input
												type="checkbox"
												aria-label="Chọn tất cả phòng học trên trang hiện tại"
												checked={isAllCurrentPageSelected}
												disabled={!hasVisibleClassrooms}
												onChange={toggleSelectAllCurrentPage}
											/>
										</th>
										<th className="px-4 py-3 font-medium">Phòng học</th>
										<th className="px-4 py-3 font-medium">Tòa nhà</th>
										<th className="px-4 py-3 translate-x-4 font-medium">Loại</th>
										<th className="px-4 py-3 text-center font-medium">Sức chứa</th>
										<th className="px-4 py-3 translate-x-4 font-medium">Trạng thái</th>
										<th className="px-4 py-3 translate-x-8 font-medium">Ngày tạo</th>
										<th className="px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{classroomsQuery.isLoading || buildingsQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={8} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : classroomsQuery.error || buildingsQuery.error ? (
										<tr>
											<td colSpan={8} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách phòng học.
											</td>
										</tr>
									) : classrooms.length === 0 ? (
										<tr>
											<td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy phòng học phù hợp.
											</td>
										</tr>
									) : (
										classrooms.map((item) => (
											<tr key={item.id} className="border-t hover:bg-muted/40">
												<td className="px-4 py-4">
													<input
														type="checkbox"
														aria-label={`Chọn phòng học ${item.code}`}
														checked={selectedClassroomIdSet.has(item.id)}
														onChange={() => toggleSelectClassroom(item.id)}
													/>
												</td>
												<td className="px-4 py-4 font-medium">{item.code}</td>
												<td className="px-4 py-4 translate-x-4">
													{buildingById.get(item.buildingId)?.code ?? `ID ${item.buildingId}`}
												</td>
												<td className="px-4 py-4">{getTypeLabel(item.type)}</td>
												<td className="px-4 py-4 text-center">{item.capacity}</td>
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
																	to: "/classrooms/$classroomId/edit",
																	params: { classroomId: String(item.id) },
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
