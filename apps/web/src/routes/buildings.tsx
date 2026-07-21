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

export const Route = createFileRoute("/buildings")({
	component: BuildingsRoute,
});

type BuildingStatus = "active" | "inactive";

type BuildingItem = {
	id: number;
	code: string;
	status: BuildingStatus;
	classroomCount?: number;
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

function getStatusLabel(status: BuildingStatus) {
	return status === "active" ? "Đang hoạt động" : "Ngừng hoạt động";
}

function BuildingsRoute() {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/buildings/");
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
	const canRead = hasPermission(permissionMap, "buildings", "read");
	const canCreate = hasPermission(permissionMap, "buildings", "create");
	const canUpdate = hasPermission(permissionMap, "buildings", "update");
	const canDelete = hasPermission(permissionMap, "buildings", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedBuildingIds, setSelectedBuildingIds] = useState<number[]>([]);

	const buildingsQuery = useQuery({
		...orpc["buildings.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as BuildingStatus) : undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const buildings = (buildingsQuery.data?.buildings ?? []) as BuildingItem[];
	const pagination = buildingsQuery.data?.pagination;
	const selectedBuildingIdSet = useMemo(
		() => new Set(selectedBuildingIds),
		[selectedBuildingIds],
	);
	const currentPageBuildingIds = useMemo(
		() => buildings.map((item) => item.id),
		[buildings],
	);
	const hasVisibleBuildings = currentPageBuildingIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleBuildings &&
		currentPageBuildingIds.every((id) => selectedBuildingIdSet.has(id));

	useEffect(() => {
		setSelectedBuildingIds((currentIds) => {
			const nextIds = currentIds.filter((id) =>
				currentPageBuildingIds.includes(id),
			);
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageBuildingIds]);

	const deleteBuildingMutation = useMutation(
		orpc["buildings.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} tòa nhà`);
				setSelectedBuildingIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedBuildingIds(
			isAllCurrentPageSelected ? [] : currentPageBuildingIds,
		);
	};

	const toggleSelectBuilding = (buildingId: number) => {
		setSelectedBuildingIds((currentIds) =>
			currentIds.includes(buildingId)
				? currentIds.filter((id) => id !== buildingId)
				: [...currentIds, buildingId],
		);
	};

	const handleDeleteSelectedBuildings = () => {
		if (selectedBuildingIds.length === 0) return;
		if (!confirm(`Xóa ${selectedBuildingIds.length} tòa nhà đã chọn?`)) return;
		deleteBuildingMutation.mutate({ buildingIds: selectedBuildingIds });
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
				pageTitle="Quản lý tòa nhà"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý tòa nhà."
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
			pageTitle="Quản lý tòa nhà"
			pageDescription="Theo dõi danh sách tòa nhà, trạng thái hoạt động và số phòng học."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-bold">Danh sách tòa nhà</CardTitle>
							<CardDescription>
								Tìm kiếm tòa nhà, lọc trạng thái và thao tác chỉnh sửa.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							{canDelete && selectedBuildingIds.length > 0 ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteSelectedBuildings}
									disabled={deleteBuildingMutation.isPending}
								>
									<Trash2 data-icon="inline-start" />
									Xóa {selectedBuildingIds.length} tòa nhà
								</Button>
							) : null}
							{canCreate ? (
								<Button type="button" onClick={() => navigate({ to: "/buildings/create" })}>
									<Plus data-icon="inline-start" />
									Thêm tòa nhà
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="building-search">Tìm kiếm</Label>
							<Input
								id="building-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Tìm theo mã tòa nhà"
							/>
						</div>
						<div className="flex flex-col gap-2 md:max-w-xs">
							<Label htmlFor="building-filter-status">Trạng thái</Label>
							<select
								id="building-filter-status"
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
							<table className="w-full table-fixed text-[15px]">
								<colgroup>
									<col className="w-12" />
									<col className="w-20"/>
									<col className="w-40" />
									<col className="w-50" />
									<col className="w-48" />
									<col className="w-32" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="w-12 px-4 py-3">
											<input
												type="checkbox"
												aria-label="Chọn tất cả tòa nhà trên trang hiện tại"
												checked={isAllCurrentPageSelected}
												disabled={!hasVisibleBuildings}
												onChange={toggleSelectAllCurrentPage}
											/>
										</th>
										<th className="px-4 py-3 font-medium">Tòa nhà</th>
										<th className="px-4 py-3 text-center font-medium">Phòng học</th>
										<th className="px-4 py-3 translate-x-4 font-medium">Trạng thái</th>
										<th className="px-4 py-3 translate-x-8 font-medium">Ngày tạo</th>
										<th className="px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{buildingsQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={6} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : buildingsQuery.error ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách tòa nhà.
											</td>
										</tr>
									) : buildings.length === 0 ? (
										<tr>
											<td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy tòa nhà phù hợp.
											</td>
										</tr>
									) : (
										buildings.map((item) => (
											<tr key={item.id} className="border-t hover:bg-muted/40">
												<td className="px-4 py-4">
													<input
														type="checkbox"
														aria-label={`Chọn tòa nhà ${item.code}`}
														checked={selectedBuildingIdSet.has(item.id)}
														onChange={() => toggleSelectBuilding(item.id)}
													/>
												</td>
												<td className="px-4 py-4 translate-x-4 font-medium">{item.code}</td>
												<td className="px-4 py-4 text-center">
													{item.classroomCount ?? 0}
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
																	to: "/buildings/$buildingId/edit",
																	params: { buildingId: String(item.id) },
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
