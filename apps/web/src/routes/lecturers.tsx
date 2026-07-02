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
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/lecturers")({
	component: LecturersRoute,
});

type LecturerStatus = "active" | "inactive";

type LecturerItem = {
	id: number;
	name: string;
	dob: string;
	email: string;
	phone: string;
	departmentId: number;
	position: string;
	status: LecturerStatus;
	departmentName: string;
	departmentCode: string;
	facultyName: string;
	facultyCode: string;
};

type DepartmentOption = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	status: "active" | "inactive";
};

type LecturerFormState = {
	lecturerId: number;
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
	name: "",
	dob: "",
	email: "",
	phone: "",
	departmentId: 0,
	position: "",
	status: "active",
};

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

	const lecturersQuery = useQuery({
		...orpc["lecturers.list"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const departmentOptionsQuery = useQuery({
		...orpc["departments.options"].queryOptions(),
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
	const selectedLecturer = useMemo(
		() => lecturers.find((item) => item.id === selectedLecturerId) ?? null,
		[lecturers, selectedLecturerId],
	);

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
		if (isCreatingLecturer || !selectedLecturer) {
			return;
		}

		setLecturerForm({
			lecturerId: selectedLecturer.id,
			name: selectedLecturer.name,
			dob: selectedLecturer.dob,
			email: selectedLecturer.email,
			phone: selectedLecturer.phone,
			departmentId: selectedLecturer.departmentId,
			position: selectedLecturer.position,
			status: selectedLecturer.status,
		});
	}, [isCreatingLecturer, selectedLecturer]);

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
			departmentId: departmentOptions[0]?.id ?? 0,
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
							{lecturersQuery.isLoading || departmentOptionsQuery.isLoading ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-14 w-full" />
									<Skeleton className="h-14 w-full" />
									<Skeleton className="h-14 w-full" />
								</div>
							) : lecturersQuery.error || departmentOptionsQuery.error ? (
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
												<th className="p-3">Khoa</th>
												<th className="p-3">Trạng thái</th>
											</tr>
										</thead>
										<tbody>
											{lecturers.map((item) => (
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
															{item.position} • {item.dob}
														</div>
													</td>
													<td className="p-3">
														<div>{item.email}</div>
														<div className="text-muted-foreground text-xs">
															{item.phone}
														</div>
													</td>
													<td className="p-3">
														<div>{item.departmentName}</div>
														<div className="text-muted-foreground text-xs">
															{item.departmentCode}
														</div>
													</td>
													<td className="p-3">
														<div>{item.facultyName}</div>
														<div className="text-muted-foreground text-xs">
															{item.facultyCode}
														</div>
													</td>
													<td className="p-3">{item.status}</td>
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
									>
										<option value={0}>Chọn bộ môn</option>
										{departmentOptions.map((item) => (
											<option key={item.id} value={item.id}>
												{item.name}
											</option>
										))}
									</select>
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
