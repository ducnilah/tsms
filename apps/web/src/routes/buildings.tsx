import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Building2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ListControls } from "@/components/list-controls";
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
};

type BuildingFormState = {
	buildingId: number;
	code: string;
	status: BuildingStatus;
};

const EMPTY_BUILDING_FORM: BuildingFormState = {
	buildingId: 0,
	code: "",
	status: "active",
};

function BuildingsRoute() {
	const navigate = useNavigate();
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
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const limit = 6;

	const buildingsQuery = useQuery({
		...orpc["buildings.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as BuildingStatus) : undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const [selectedBuildingId, setSelectedBuildingId] = useState(0);
	const [isCreatingBuilding, setIsCreatingBuilding] = useState(false);
	const [buildingForm, setBuildingForm] =
		useState<BuildingFormState>(EMPTY_BUILDING_FORM);

	const buildings = (buildingsQuery.data?.buildings ?? []) as BuildingItem[];
	const pagination = buildingsQuery.data?.pagination;
	const selectedBuilding = useMemo(
		() => buildings.find((item) => item.id === selectedBuildingId) ?? null,
		[buildings, selectedBuildingId],
	);

	useEffect(() => {
		if (!isCreatingBuilding && selectedBuildingId === 0 && buildings.length > 0) {
			setSelectedBuildingId(buildings[0].id);
		}
	}, [buildings, isCreatingBuilding, selectedBuildingId]);

	useEffect(() => {
		if (buildings.length === 0) {
			setSelectedBuildingId(0);
			if (!isCreatingBuilding) {
				setBuildingForm(EMPTY_BUILDING_FORM);
			}
			return;
		}

		if (
			!isCreatingBuilding &&
			!buildings.some((item) => item.id === selectedBuildingId)
		) {
			setSelectedBuildingId(buildings[0].id);
		}
	}, [buildings, isCreatingBuilding, selectedBuildingId]);

	useEffect(() => {
		if (isCreatingBuilding || !selectedBuilding) {
			return;
		}

		setBuildingForm({
			buildingId: selectedBuilding.id,
			code: selectedBuilding.code,
			status: selectedBuilding.status,
		});
	}, [isCreatingBuilding, selectedBuilding]);

	const invalidateBuildings = async () => {
		await queryClient.invalidateQueries({
			queryKey: orpc["buildings.list"].queryKey(),
		});
	};

	const createBuildingMutation = useMutation(
		orpc["buildings.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Tạo tòa nhà thành công");
				setIsCreatingBuilding(false);
				setSelectedBuildingId(data.building.id);
				await invalidateBuildings();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateBuildingMutation = useMutation(
		orpc["buildings.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Cập nhật tòa nhà thành công");
				setIsCreatingBuilding(false);
				setSelectedBuildingId(data.building.id);
				await invalidateBuildings();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteBuildingMutation = useMutation(
		orpc["buildings.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Xóa tòa nhà thành công");
				setIsCreatingBuilding(false);
				setBuildingForm(EMPTY_BUILDING_FORM);
				await invalidateBuildings();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSaveBuilding = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (buildingForm.buildingId > 0) {
			updateBuildingMutation.mutate(buildingForm);
			return;
		}

		createBuildingMutation.mutate({
			code: buildingForm.code,
		});
	};

	const beginCreateBuilding = () => {
		setIsCreatingBuilding(true);
		setSelectedBuildingId(0);
		setBuildingForm(EMPTY_BUILDING_FORM);
	};

	const handleDeleteBuilding = () => {
		if (!selectedBuilding) {
			return;
		}

		if (!confirm(`Xóa tòa nhà ${selectedBuilding.code}?`)) {
			return;
		}

		deleteBuildingMutation.mutate({ buildingId: selectedBuilding.id });
	};

	if (meQuery.isLoading) {
		return (
			<div className="grid min-h-svh place-items-center bg-muted/30">
				<Skeleton className="h-24 w-80" />
			</div>
		);
	}

	if (!currentUser) {
		return null;
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
					<CardContent className="p-6 text-muted-foreground text-sm">
						Vui lòng liên hệ quản trị viên để được cấp quyền.
					</CardContent>
				</Card>
			</AppShell>
		);
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Quản lý tòa nhà"
			pageDescription="Tạo, cập nhật, ngừng hoạt động và xóa tòa nhà."
		>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
				<Card>
					<CardHeader>
						<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
							<div>
								<CardTitle>Danh sách tòa nhà</CardTitle>
								<CardDescription>
									Chọn một tòa nhà để xem và cập nhật thông tin.
								</CardDescription>
							</div>
							{canCreate ? (
								<Button type="button" variant="outline" onClick={beginCreateBuilding}>
									<Plus data-icon="inline-start" />
									Tạo tòa nhà
								</Button>
							) : null}
						</div>
					</CardHeader>
					<CardContent>
						<div className="mb-4">
							<ListControls
								search={search}
								onSearchChange={(value) => {
									setSearch(value);
									setPage(1);
								}}
								status={statusFilter}
								onStatusChange={(value) => {
									setStatusFilter(value);
									setPage(1);
								}}
								statusOptions={[
									{ label: "Đang hoạt động", value: "active" },
									{ label: "Ngừng hoạt động", value: "inactive" },
								]}
								pagination={pagination}
								onPageChange={setPage}
							/>
						</div>
						{buildingsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : buildingsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải danh sách tòa nhà.
							</p>
						) : buildings.length === 0 ? (
							<div className="flex flex-col items-center gap-3 border border-dashed p-8 text-center">
								<Building2 className="size-10 text-muted-foreground" />
								<div>
									<p className="font-medium">Chưa có tòa nhà</p>
									<p className="text-muted-foreground text-sm">
										Hãy tạo tòa nhà đầu tiên để bắt đầu quản lý phòng học.
									</p>
								</div>
							</div>
						) : (
							<div className="overflow-hidden border">
								<table className="w-full text-sm">
									<thead className="bg-muted/60 text-muted-foreground">
										<tr>
											<th className="p-3 text-left font-medium">Mã tòa nhà</th>
											<th className="p-3 text-left font-medium">Trạng thái</th>
											<th className="p-3 text-left font-medium">Phòng học</th>
											<th className="p-3 text-right font-medium">Thao tác</th>
										</tr>
									</thead>
									<tbody>
										{buildings.map((item) => (
											<tr
												key={item.id}
												className={
													selectedBuildingId === item.id
														? "bg-muted/70"
														: "hover:bg-muted/40"
												}
											>
												<td className="p-3 font-medium">{item.code}</td>
												<td className="p-3">{item.status}</td>
												<td className="p-3">{item.classroomCount ?? 0}</td>
												<td className="p-3 text-right">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() => {
															setIsCreatingBuilding(false);
															setSelectedBuildingId(item.id);
														}}
													>
														<Pencil data-icon="inline-start" />
														Sửa
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>
							{buildingForm.buildingId > 0 ? "Cập nhật tòa nhà" : "Tạo tòa nhà"}
						</CardTitle>
						<CardDescription>
							{buildingForm.buildingId > 0
								? "Quản lý mã tòa nhà và trạng thái hoạt động."
								: "Tạo tòa nhà mới. Trạng thái mặc định sẽ là hoạt động."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSaveBuilding} className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="building-code">Mã tòa nhà</Label>
								<Input
									id="building-code"
									value={buildingForm.code}
									onChange={(event) =>
										setBuildingForm((current) => ({
											...current,
											code: event.target.value,
										}))
									}
									placeholder="VD: A1"
									disabled={
										(!canCreate && buildingForm.buildingId === 0) ||
										(!canUpdate && buildingForm.buildingId > 0)
									}
									required
								/>
							</div>

							{buildingForm.buildingId > 0 ? (
								<div className="flex flex-col gap-2">
									<Label htmlFor="building-status">Trạng thái</Label>
									<select
										id="building-status"
										className="h-9 border bg-background px-3 text-sm"
										value={buildingForm.status}
										onChange={(event) =>
											setBuildingForm((current) => ({
												...current,
												status: event.target.value as BuildingStatus,
											}))
										}
										disabled={!canUpdate}
									>
										<option value="active">Đang hoạt động</option>
										<option value="inactive">Ngừng hoạt động</option>
									</select>
								</div>
							) : null}

							<div className="flex flex-wrap gap-2">
								{(buildingForm.buildingId > 0 ? canUpdate : canCreate) ? (
									<Button
										type="submit"
										disabled={
											createBuildingMutation.isPending ||
											updateBuildingMutation.isPending
										}
									>
										<Save data-icon="inline-start" />
										{buildingForm.buildingId > 0
											? "Lưu tòa nhà"
											: "Tạo tòa nhà"}
									</Button>
								) : null}
								<Button type="button" variant="outline" onClick={beginCreateBuilding}>
									Làm mới
								</Button>
								{canDelete && buildingForm.buildingId > 0 ? (
									<Button
										type="button"
										variant="outline"
										onClick={handleDeleteBuilding}
										disabled={deleteBuildingMutation.isPending}
									>
										<Trash2 data-icon="inline-start" />
										Xóa
									</Button>
								) : null}
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
