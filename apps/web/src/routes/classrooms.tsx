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
import { DoorOpen, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ListControls } from "@/components/list-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/classrooms")({
	component: ClassroomsRoute,
});

type ClassroomStatus = "active" | "inactive";
type ClassroomType = "lecture" | "lab" | "seminar";

type ClassroomItem = {
	id: number;
	code: string;
	buildingId: number;
	capacity: number;
	type: ClassroomType;
	status: ClassroomStatus;
};

type BuildingOption = {
	id: number;
	code: string;
	status: ClassroomStatus;
};

type ClassroomFormState = {
	classroomId: number;
	code: string;
	buildingId: number;
	capacity: number;
	type: ClassroomType;
	status: ClassroomStatus;
};

const EMPTY_CLASSROOM_FORM: ClassroomFormState = {
	classroomId: 0,
	code: "",
	buildingId: 0,
	capacity: 40,
	type: "lecture",
	status: "active",
};

const CLASSROOM_TYPE_OPTIONS = [
	{ label: "Lý thuyết", value: "lecture" },
	{ label: "Phòng lab", value: "lab" },
	{ label: "Seminar", value: "seminar" },
] as const;

function ClassroomsRoute() {
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
	const canRead = hasPermission(permissionMap, "classrooms", "read");
	const canCreate = hasPermission(permissionMap, "classrooms", "create");
	const canUpdate = hasPermission(permissionMap, "classrooms", "update");
	const canDelete = hasPermission(permissionMap, "classrooms", "delete");

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [typeFilter, setTypeFilter] = useState("");
	const [buildingFilterId, setBuildingFilterId] = useState(0);
	const limit = 6;

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
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const buildingsQuery = useQuery({
		...orpc["buildings.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const [selectedClassroomId, setSelectedClassroomId] = useState(0);
	const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);
	const [classroomForm, setClassroomForm] =
		useState<ClassroomFormState>(EMPTY_CLASSROOM_FORM);

	const classrooms = (classroomsQuery.data?.classrooms ?? []) as ClassroomItem[];
	const buildings = (buildingsQuery.data?.buildings ?? []) as BuildingOption[];
	const pagination = classroomsQuery.data?.pagination;
	const selectedClassroom = useMemo(
		() => classrooms.find((item) => item.id === selectedClassroomId) ?? null,
		[classrooms, selectedClassroomId],
	);
	const getBuildingCode = (buildingId: number) =>
		buildings.find((item) => item.id === buildingId)?.code ?? `ID ${buildingId}`;

	useEffect(() => {
		if (!isCreatingClassroom && selectedClassroomId === 0 && classrooms.length > 0) {
			setSelectedClassroomId(classrooms[0].id);
		}
	}, [classrooms, isCreatingClassroom, selectedClassroomId]);

	useEffect(() => {
		if (classrooms.length === 0) {
			setSelectedClassroomId(0);
			if (!isCreatingClassroom) {
				setClassroomForm(EMPTY_CLASSROOM_FORM);
			}
			return;
		}

		if (
			!isCreatingClassroom &&
			!classrooms.some((item) => item.id === selectedClassroomId)
		) {
			setSelectedClassroomId(classrooms[0].id);
		}
	}, [classrooms, isCreatingClassroom, selectedClassroomId]);

	useEffect(() => {
		if (isCreatingClassroom || !selectedClassroom) {
			return;
		}

		setClassroomForm({
			classroomId: selectedClassroom.id,
			code: selectedClassroom.code,
			buildingId: selectedClassroom.buildingId,
			capacity: selectedClassroom.capacity,
			type: selectedClassroom.type,
			status: selectedClassroom.status,
		});
	}, [isCreatingClassroom, selectedClassroom]);

	const invalidateClassrooms = async () => {
		await queryClient.invalidateQueries();
	};

	const createClassroomMutation = useMutation(
		orpc["classrooms.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo phòng học");
				setIsCreatingClassroom(false);
				setSelectedClassroomId(data.classroom.id);
				await invalidateClassrooms();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateClassroomMutation = useMutation(
		orpc["classrooms.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật phòng học");
				setIsCreatingClassroom(false);
				setSelectedClassroomId(data.classroom.id);
				await invalidateClassrooms();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteClassroomMutation = useMutation(
		orpc["classrooms.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa phòng học");
				setIsCreatingClassroom(false);
				setClassroomForm(EMPTY_CLASSROOM_FORM);
				await invalidateClassrooms();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSaveClassroom = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!classroomForm.buildingId) {
			toast.error("Vui lòng chọn tòa nhà");
			return;
		}

		if (classroomForm.classroomId > 0) {
			updateClassroomMutation.mutate(classroomForm);
			return;
		}

		createClassroomMutation.mutate({
			code: classroomForm.code,
			buildingId: classroomForm.buildingId,
			capacity: classroomForm.capacity,
			type: classroomForm.type,
		});
	};

	const beginCreateClassroom = () => {
		setIsCreatingClassroom(true);
		setSelectedClassroomId(0);
		setClassroomForm({
			...EMPTY_CLASSROOM_FORM,
			buildingId: buildings[0]?.id ?? 0,
		});
	};

	const handleDeleteClassroom = () => {
		if (!selectedClassroom) {
			return;
		}

		if (!confirm(`Xóa phòng học ${selectedClassroom.code}?`)) {
			return;
		}

		deleteClassroomMutation.mutate({ classroomId: selectedClassroom.id });
	};

	if (meQuery.isLoading) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return null;
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
					<CardContent className="p-6 text-muted-foreground text-sm">
						Vui lòng liên hệ quản trị viên để được cấp quyền phù hợp.
					</CardContent>
				</Card>
			</AppShell>
		);
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Quản lý phòng học"
			pageDescription="Tạo, cập nhật, lọc và xóa phòng học theo từng tòa nhà."
		>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
				<Card>
					<CardHeader>
						<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
							<div>
								<CardTitle>Danh sách phòng học</CardTitle>
								<CardDescription>
									Search theo mã phòng, lọc theo tòa nhà, loại phòng và trạng thái.
								</CardDescription>
							</div>
							{canCreate ? (
								<Button type="button" variant="outline" onClick={beginCreateClassroom}>
									<Plus data-icon="inline-start" />
									Tạo phòng học
								</Button>
							) : null}
						</div>
					</CardHeader>
					<CardContent>
						<div className="mb-4 flex flex-col gap-3">
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
							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="classroom-filter-building">Tòa nhà</Label>
									<select
										id="classroom-filter-building"
										className="border bg-background px-3 py-2 text-sm"
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
										className="border bg-background px-3 py-2 text-sm"
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
							</div>
						</div>

						{classroomsQuery.isLoading || buildingsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : classroomsQuery.error || buildingsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải danh sách phòng học.
							</p>
						) : classrooms.length === 0 ? (
							<div className="flex flex-col items-center gap-3 border border-dashed p-8 text-center">
								<DoorOpen className="size-10 text-muted-foreground" />
								<div>
									<p className="font-medium">Chưa có phòng học</p>
									<p className="text-muted-foreground text-sm">
										Hãy tạo phòng học đầu tiên hoặc đổi điều kiện tìm kiếm.
									</p>
								</div>
							</div>
						) : (
							<div className="overflow-x-auto border">
								<table className="w-full min-w-[760px] text-sm">
									<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
										<tr>
											<th className="p-3">Phòng</th>
											<th className="p-3">Tòa nhà</th>
											<th className="p-3">Loại</th>
											<th className="p-3">Sức chứa</th>
											<th className="p-3">Trạng thái</th>
											<th className="p-3 text-right">Thao tác</th>
										</tr>
									</thead>
									<tbody>
										{classrooms.map((item) => (
											<tr
												key={item.id}
												className={
													selectedClassroomId === item.id
														? "border-t bg-muted/70"
														: "border-t hover:bg-muted/40"
												}
											>
												<td className="p-3 font-medium">{item.code}</td>
												<td className="p-3">{getBuildingCode(item.buildingId)}</td>
												<td className="p-3">{item.type}</td>
												<td className="p-3">{item.capacity}</td>
												<td className="p-3">{item.status}</td>
												<td className="p-3 text-right">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() => {
															setIsCreatingClassroom(false);
															setSelectedClassroomId(item.id);
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
							{classroomForm.classroomId > 0 ? "Cập nhật phòng học" : "Tạo phòng học"}
						</CardTitle>
						<CardDescription>
							Thông tin phòng học sẽ được kiểm tra lại ở backend trước khi lưu.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSaveClassroom} className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="classroom-code">Mã phòng</Label>
								<Input
									id="classroom-code"
									value={classroomForm.code}
									onChange={(event) =>
										setClassroomForm((current) => ({
											...current,
											code: event.target.value,
										}))
									}
									required
								/>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="classroom-building">Tòa nhà</Label>
								<select
									id="classroom-building"
									className="h-9 border bg-background px-3 text-sm"
									value={classroomForm.buildingId}
									onChange={(event) =>
										setClassroomForm((current) => ({
											...current,
											buildingId: Number(event.target.value),
										}))
									}
									required
								>
									<option value={0}>Chọn tòa nhà</option>
									{buildings.map((item) => (
										<option key={item.id} value={item.id}>
											{item.code}
										</option>
									))}
								</select>
							</div>

							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="classroom-capacity">Sức chứa</Label>
									<Input
										id="classroom-capacity"
										type="number"
										min={1}
										value={classroomForm.capacity}
										onChange={(event) =>
											setClassroomForm((current) => ({
												...current,
												capacity: Number(event.target.value),
											}))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="classroom-type">Loại phòng</Label>
									<select
										id="classroom-type"
										className="h-9 border bg-background px-3 text-sm"
										value={classroomForm.type}
										onChange={(event) =>
											setClassroomForm((current) => ({
												...current,
												type: event.target.value as ClassroomType,
											}))
										}
									>
										{CLASSROOM_TYPE_OPTIONS.map((item) => (
											<option key={item.value} value={item.value}>
												{item.label}
											</option>
										))}
									</select>
								</div>
							</div>

							{classroomForm.classroomId > 0 ? (
								<div className="flex flex-col gap-2">
									<Label htmlFor="classroom-status">Trạng thái</Label>
									<select
										id="classroom-status"
										className="h-9 border bg-background px-3 text-sm"
										value={classroomForm.status}
										onChange={(event) =>
											setClassroomForm((current) => ({
												...current,
												status: event.target.value as ClassroomStatus,
											}))
										}
									>
										<option value="active">Đang hoạt động</option>
										<option value="inactive">Ngừng hoạt động</option>
									</select>
								</div>
							) : null}

							<div className="flex flex-wrap gap-2">
								{(classroomForm.classroomId > 0 ? canUpdate : canCreate) ? (
									<Button
										type="submit"
										disabled={
											createClassroomMutation.isPending ||
											updateClassroomMutation.isPending
										}
									>
										<Save data-icon="inline-start" />
										Lưu phòng học
									</Button>
								) : null}
								<Button type="button" variant="outline" onClick={beginCreateClassroom}>
									Làm mới
								</Button>
								{classroomForm.classroomId > 0 && canDelete ? (
									<Button
										type="button"
										variant="destructive"
										disabled={deleteClassroomMutation.isPending}
										onClick={handleDeleteClassroom}
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
