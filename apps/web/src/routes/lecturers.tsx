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
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ListControls } from "@/components/list-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/lecturers")({
	component: LecturersRoute,
});

type LecturerStatus = "active" | "inactive";

type LecturerItem = {
	id: number;
	name: string;
	email: string;
	phone: string;
	departmentId: number;
	position: string;
	status: LecturerStatus;
};

type DepartmentOption = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	status: "active" | "inactive";
};

type FacultyOption = {
	id: number;
	code: string;
	name: string;
	status: "active" | "inactive";
};

type LecturerFormState = {
	lecturerId: number;
	facultyId: number;
	name: string;
	dob: string;
	email: string;
	phone: string;
	departmentId: number;
	position: string;
	status: LecturerStatus;
};

const EMPTY_LECTURER_FORM: LecturerFormState = {
	lecturerId: 0,
	facultyId: 0,
	name: "",
	dob: "",
	email: "",
	phone: "",
	departmentId: 0,
	position: "",
	status: "active",
};

function toDateInputValue(value: string | Date | null | undefined) {
	if (!value) {
		return "";
	}

	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}

	return value.slice(0, 10);
}

function LecturersRoute() {
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
	const canRead = hasPermission(permissionMap, "lecturers", "read");
	const canCreate = hasPermission(permissionMap, "lecturers", "create");
	const canUpdate = hasPermission(permissionMap, "lecturers", "update");
	const canDelete = hasPermission(permissionMap, "lecturers", "delete");

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedFacultyFilterId, setSelectedFacultyFilterId] = useState(0);
	const [selectedDepartmentFilterId, setSelectedDepartmentFilterId] = useState(0);
	const limit = 6;

	const lecturersQuery = useQuery({
		...orpc["lecturers.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as LecturerStatus) : undefined,
				facultyId: selectedFacultyFilterId || undefined,
				departmentId: selectedDepartmentFilterId || undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const departmentOptionsQuery = useQuery({
		...orpc["departments.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const facultyOptionsQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const [selectedLecturerId, setSelectedLecturerId] = useState(0);
	const [isCreatingLecturer, setIsCreatingLecturer] = useState(false);
	const [lecturerForm, setLecturerForm] =
		useState<LecturerFormState>(EMPTY_LECTURER_FORM);

	const lecturers = (lecturersQuery.data?.lecturers ?? []) as LecturerItem[];
	const departmentOptions = (departmentOptionsQuery.data?.departments ??
		[]) as DepartmentOption[];
	const facultyOptions = (facultyOptionsQuery.data?.faculties ?? []) as FacultyOption[];
	const pagination = lecturersQuery.data?.pagination;
	const getDepartmentOption = (departmentId: number) =>
		departmentOptions.find((item) => item.id === departmentId);
	const filteredDepartmentOptions = selectedFacultyFilterId
		? departmentOptions.filter((item) => item.facultyId === selectedFacultyFilterId)
		: departmentOptions;
	const formDepartmentOptions = lecturerForm.facultyId
		? departmentOptions.filter((item) => item.facultyId === lecturerForm.facultyId)
		: departmentOptions;
	const selectedLecturer = useMemo(
		() => lecturers.find((item) => item.id === selectedLecturerId) ?? null,
		[lecturers, selectedLecturerId],
	);
	const selectedLecturerQuery = useQuery({
		...orpc["lecturers.byId"].queryOptions({
			input: { lecturerId: selectedLecturerId },
		}),
		enabled: Boolean(currentUser) && canRead && selectedLecturerId > 0,
		meta: { skipErrorToast: !canRead },
	});

	useEffect(() => {
		if (!isCreatingLecturer && selectedLecturerId === 0 && lecturers.length > 0) {
			setSelectedLecturerId(lecturers[0].id);
		}
	}, [isCreatingLecturer, lecturers, selectedLecturerId]);

	useEffect(() => {
		if (lecturers.length === 0) {
			setSelectedLecturerId(0);
			if (!isCreatingLecturer) {
				setLecturerForm(EMPTY_LECTURER_FORM);
			}
			return;
		}

		if (
			!isCreatingLecturer &&
			!lecturers.some((item) => item.id === selectedLecturerId)
		) {
			setSelectedLecturerId(lecturers[0].id);
		}
	}, [isCreatingLecturer, lecturers, selectedLecturerId]);

	useEffect(() => {
		const detailedLecturer = selectedLecturerQuery.data?.lecturer;

		if (isCreatingLecturer || !selectedLecturer || !detailedLecturer) {
			return;
		}

		const selectedDepartment = getDepartmentOption(detailedLecturer.departmentId);

		setLecturerForm({
			lecturerId: detailedLecturer.id,
			facultyId: selectedDepartment?.facultyId ?? 0,
			name: detailedLecturer.name,
			dob: toDateInputValue(detailedLecturer.dob),
			email: detailedLecturer.email,
			phone: detailedLecturer.phone,
			departmentId: detailedLecturer.departmentId,
			position: detailedLecturer.position,
			status: detailedLecturer.status as LecturerStatus,
		});
	}, [departmentOptions, isCreatingLecturer, selectedLecturer, selectedLecturerQuery.data]);

	const invalidateManagementQueries = async () => {
		await queryClient.invalidateQueries();
	};

	const createLecturerMutation = useMutation(
		orpc["lecturers.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo giảng viên");
				setIsCreatingLecturer(false);
				setSelectedLecturerId(data.lecturer.id);
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateLecturerMutation = useMutation(
		orpc["lecturers.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật giảng viên");
				setIsCreatingLecturer(false);
				setSelectedLecturerId(data.lecturer.id);
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteLecturerMutation = useMutation(
		orpc["lecturers.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa giảng viên");
				setIsCreatingLecturer(false);
				setLecturerForm(EMPTY_LECTURER_FORM);
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSaveLecturer = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!lecturerForm.departmentId) {
			toast.error("Vui lòng chọn bộ môn cho giảng viên");
			return;
		}

		if (lecturerForm.lecturerId > 0) {
			updateLecturerMutation.mutate(lecturerForm);
			return;
		}

		createLecturerMutation.mutate({
			name: lecturerForm.name,
			dob: lecturerForm.dob,
			email: lecturerForm.email,
			phone: lecturerForm.phone,
			departmentId: lecturerForm.departmentId,
			position: lecturerForm.position,
		});
	};

	const beginCreateLecturer = () => {
		setIsCreatingLecturer(true);
		setSelectedLecturerId(0);
		setLecturerForm({
			...EMPTY_LECTURER_FORM,
			facultyId: selectedFacultyFilterId || facultyOptions[0]?.id || 0,
			departmentId:
				departmentOptions.find(
					(item) =>
						item.facultyId === (selectedFacultyFilterId || facultyOptions[0]?.id),
				)?.id ?? 0,
		});
	};

	const handleDeleteLecturer = () => {
		if (!selectedLecturer) {
			toast.error("Vui lòng chọn giảng viên");
			return;
		}

		if (!confirm(`Xóa giảng viên ${selectedLecturer.name}?`)) {
			return;
		}

		deleteLecturerMutation.mutate({ lecturerId: selectedLecturer.id });
	};

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
				pageTitle="Quản lý giảng viên"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý giảng viên."
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
			pageTitle="Quản lý giảng viên"
			pageDescription="Tạo, cập nhật, ngừng hoạt động và xóa hồ sơ giảng viên."
		>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
				<div className="grid gap-5 xl:grid-cols-[1fr_420px]">
					<Card>
						<CardHeader>
							<div className="flex items-start justify-between gap-3">
								<div>
									<CardTitle>Danh sách giảng viên</CardTitle>
									<CardDescription>
										Chọn một giảng viên để xem và chỉnh sửa thông tin.
									</CardDescription>
								</div>
								{canCreate ? (
									<Button type="button" variant="outline" onClick={beginCreateLecturer}>
										<Plus data-icon="inline-start" />
										Thêm giảng viên
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
										<Label htmlFor="lecturer-filter-faculty">Lọc theo khoa</Label>
										<select
											id="lecturer-filter-faculty"
											className="border bg-background px-3 py-2 text-sm"
											value={selectedFacultyFilterId}
											onChange={(event) => {
												setSelectedFacultyFilterId(Number(event.target.value));
												setSelectedDepartmentFilterId(0);
												setPage(1);
											}}
										>
											<option value={0}>Tất cả khoa</option>
											{facultyOptions.map((item) => (
												<option key={item.id} value={item.id}>
													{item.name}
												</option>
											))}
										</select>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="lecturer-filter-department">Lọc theo bộ môn</Label>
										<select
											id="lecturer-filter-department"
											className="border bg-background px-3 py-2 text-sm"
											value={selectedDepartmentFilterId}
											onChange={(event) => {
												setSelectedDepartmentFilterId(Number(event.target.value));
												setPage(1);
											}}
										>
											<option value={0}>Tất cả bộ môn</option>
											{filteredDepartmentOptions.map((item) => (
												<option key={item.id} value={item.id}>
													{item.name}
												</option>
											))}
										</select>
									</div>
								</div>
							</div>
							{lecturersQuery.isLoading ||
							departmentOptionsQuery.isLoading ||
							facultyOptionsQuery.isLoading ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-14 w-full" />
									<Skeleton className="h-14 w-full" />
									<Skeleton className="h-14 w-full" />
								</div>
							) : lecturersQuery.error ||
								departmentOptionsQuery.error ||
								facultyOptionsQuery.error ? (
								<p className="text-destructive text-sm">
									Không thể tải dữ liệu giảng viên.
								</p>
							) : lecturers.length === 0 ? (
								<div className="border px-3 py-4 text-sm">
									Chưa có giảng viên nào trong hệ thống.
								</div>
							) : (
								<div className="overflow-x-auto border">
									<table className="w-full min-w-[940px] text-sm">
										<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
											<tr>
												<th className="p-3">Giảng viên</th>
												<th className="p-3">Liên hệ</th>
												<th className="p-3">Bộ môn</th>
												<th className="p-3">Trạng thái</th>
											</tr>
										</thead>
										<tbody>
											{lecturers.map((item) => {
												const departmentOption = getDepartmentOption(item.departmentId);

												return (
												<tr
													key={item.id}
													className={`cursor-pointer border-t transition-colors ${
														selectedLecturerId === item.id
															? "bg-muted/50"
															: "hover:bg-muted/30"
													}`}
													onClick={() => {
														setIsCreatingLecturer(false);
														setSelectedLecturerId(item.id);
													}}
												>
													<td className="p-3">
														<div className="font-medium">{item.name}</div>
														<div className="text-muted-foreground text-xs">
															{item.position}
														</div>
													</td>
													<td className="p-3">
														<div>{item.email}</div>
														<div className="text-muted-foreground text-xs">
															{item.phone}
														</div>
													</td>
													<td className="p-3">
														<div>{departmentOption?.name ?? "Không xác định"}</div>
														<div className="text-muted-foreground text-xs">
															{departmentOption?.code ?? `ID ${item.departmentId}`}
														</div>
													</td>
													<td className="p-3">{item.status}</td>
												</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>
								{lecturerForm.lecturerId > 0
									? "Cập nhật giảng viên"
									: "Tạo giảng viên"}
							</CardTitle>
							<CardDescription>
								{lecturerForm.lecturerId > 0
									? "Quản lý hồ sơ giảng viên và trạng thái hoạt động."
									: "Tạo hồ sơ giảng viên mới. Trạng thái mặc định sẽ là hoạt động."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSaveLecturer} className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<Label htmlFor="lecturer-name">Họ và tên</Label>
									<Input
										id="lecturer-name"
										value={lecturerForm.name}
										onChange={(event) =>
											setLecturerForm((current) => ({
												...current,
												name: event.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="lecturer-dob">Ngày sinh</Label>
										<Input
											id="lecturer-dob"
											type="date"
											value={lecturerForm.dob}
											onChange={(event) =>
												setLecturerForm((current) => ({
													...current,
													dob: event.target.value,
												}))
											}
											required
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="lecturer-position">Chức vụ</Label>
										<Input
											id="lecturer-position"
											value={lecturerForm.position}
											onChange={(event) =>
												setLecturerForm((current) => ({
													...current,
													position: event.target.value,
												}))
											}
											required
										/>
									</div>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="lecturer-email">Email</Label>
										<Input
											id="lecturer-email"
											type="email"
											value={lecturerForm.email}
											onChange={(event) =>
												setLecturerForm((current) => ({
													...current,
													email: event.target.value,
												}))
											}
											required
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="lecturer-phone">Số điện thoại</Label>
										<Input
											id="lecturer-phone"
											value={lecturerForm.phone}
											onChange={(event) =>
												setLecturerForm((current) => ({
													...current,
													phone: event.target.value,
												}))
											}
											required
										/>
									</div>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="lecturer-faculty">Khoa</Label>
										<select
											id="lecturer-faculty"
											className="border bg-background px-3 py-2 text-sm"
											value={lecturerForm.facultyId}
											onChange={(event) => {
												const facultyId = Number(event.target.value);
												const firstDepartmentId =
													departmentOptions.find((item) => item.facultyId === facultyId)
														?.id ?? 0;

												setLecturerForm((current) => ({
													...current,
													facultyId,
													departmentId: firstDepartmentId,
												}));
											}}
										>
											<option value={0}>Chọn khoa</option>
											{facultyOptions.map((item) => (
												<option key={item.id} value={item.id}>
													{item.name}
												</option>
											))}
										</select>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="lecturer-department">Bộ môn</Label>
										<select
											id="lecturer-department"
											className="border bg-background px-3 py-2 text-sm"
											value={lecturerForm.departmentId}
											onChange={(event) =>
												setLecturerForm((current) => ({
													...current,
													departmentId: Number(event.target.value),
												}))
											}
											disabled={!lecturerForm.facultyId}
										>
											<option value={0}>Chọn bộ môn</option>
											{formDepartmentOptions.map((item) => (
												<option key={item.id} value={item.id}>
													{item.name}
												</option>
											))}
										</select>
									</div>
								</div>
								{lecturerForm.lecturerId > 0 ? (
									<div className="flex flex-col gap-2">
										<Label htmlFor="lecturer-status">Trạng thái</Label>
										<select
											id="lecturer-status"
											className="border bg-background px-3 py-2 text-sm"
											value={lecturerForm.status}
											onChange={(event) =>
												setLecturerForm((current) => ({
													...current,
													status: event.target.value as LecturerStatus,
												}))
											}
										>
											<option value="active">active</option>
											<option value="inactive">inactive</option>
										</select>
									</div>
								) : null}
								<div className="flex gap-2">
									{canCreate || canUpdate ? (
										<Button
											type="submit"
											disabled={
												createLecturerMutation.isPending ||
												updateLecturerMutation.isPending
											}
										>
											<Save data-icon="inline-start" />
											{lecturerForm.lecturerId > 0
												? "Lưu giảng viên"
												: "Tạo giảng viên"}
										</Button>
									) : null}
									<Button type="button" variant="outline" onClick={beginCreateLecturer}>
										<Pencil data-icon="inline-start" />
										Form mới
									</Button>
									{canDelete && lecturerForm.lecturerId > 0 ? (
										<Button type="button" variant="outline" onClick={handleDeleteLecturer}>
											<Trash2 data-icon="inline-start" />
											Xóa
										</Button>
									) : null}
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>
		</AppShell>
	);
}
