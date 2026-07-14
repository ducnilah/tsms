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

export const Route = createFileRoute("/departments")({
	component: DepartmentsRoute,
});

type DepartmentStatus = "active" | "inactive";

type FacultyOption = {
	id: number;
	code: string;
	name: string;
	status: "active" | "inactive";
};

type DepartmentItem = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	description: string;
	status: DepartmentStatus;
};

type DepartmentFormState = {
	departmentId: number;
	facultyId: number;
	code: string;
	name: string;
	description: string;
	status: DepartmentStatus;
};

const EMPTY_DEPARTMENT_FORM: DepartmentFormState = {
	departmentId: 0,
	facultyId: 0,
	code: "",
	name: "",
	description: "",
	status: "active",
};

function DepartmentsRoute() {
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
	const canRead = hasPermission(permissionMap, "departments", "read");
	const canCreate = hasPermission(permissionMap, "departments", "create");
	const canUpdate = hasPermission(permissionMap, "departments", "update");
	const canDelete = hasPermission(permissionMap, "departments", "delete");

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedFacultyFilterId, setSelectedFacultyFilterId] = useState(0);
	const limit = 10;

	const departmentsQuery = useQuery({
		...orpc["departments.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as DepartmentStatus) : undefined,
				facultyId: selectedFacultyFilterId || undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const facultyOptionsQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const [selectedDepartmentId, setSelectedDepartmentId] = useState(0);
	const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
	const [departmentForm, setDepartmentForm] = useState<DepartmentFormState>(
		EMPTY_DEPARTMENT_FORM,
	);

	const departments = (departmentsQuery.data?.departments ?? []) as DepartmentItem[];
	const facultyOptions = (facultyOptionsQuery.data?.faculties ?? []) as FacultyOption[];
	const pagination = departmentsQuery.data?.pagination;
	const getFacultyOption = (facultyId: number) =>
		facultyOptions.find((item) => item.id === facultyId);
	const selectedDepartment = useMemo(
		() =>
			departments.find((item) => item.id === selectedDepartmentId) ?? null,
		[departments, selectedDepartmentId],
	);

	useEffect(() => {
		if (
			!isCreatingDepartment &&
			selectedDepartmentId === 0 &&
			departments.length > 0
		) {
			setSelectedDepartmentId(departments[0].id);
		}
	}, [departments, isCreatingDepartment, selectedDepartmentId]);

	useEffect(() => {
		if (departments.length === 0) {
			setSelectedDepartmentId(0);
			if (!isCreatingDepartment) {
				setDepartmentForm((current) => ({
					...EMPTY_DEPARTMENT_FORM,
					facultyId: current.facultyId,
				}));
			}
			return;
		}

		if (
			!isCreatingDepartment &&
			!departments.some((item) => item.id === selectedDepartmentId)
		) {
			setSelectedDepartmentId(departments[0].id);
		}
	}, [departments, isCreatingDepartment, selectedDepartmentId]);

	useEffect(() => {
		if (isCreatingDepartment || !selectedDepartment) {
			return;
		}

		setDepartmentForm({
			departmentId: selectedDepartment.id,
			facultyId: selectedDepartment.facultyId,
			code: selectedDepartment.code,
			name: selectedDepartment.name,
			description: selectedDepartment.description,
			status: selectedDepartment.status,
		});
	}, [isCreatingDepartment, selectedDepartment]);

	const invalidateManagementQueries = async () => {
		await queryClient.invalidateQueries();
	};

	const createDepartmentMutation = useMutation(
		orpc["departments.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo bộ môn");
				setIsCreatingDepartment(false);
				setSelectedDepartmentId(data.department.id);
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateDepartmentMutation = useMutation(
		orpc["departments.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật bộ môn");
				setIsCreatingDepartment(false);
				setSelectedDepartmentId(data.department.id);
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteDepartmentMutation = useMutation(
		orpc["departments.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa bộ môn");
				setIsCreatingDepartment(false);
				setDepartmentForm(EMPTY_DEPARTMENT_FORM);
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSaveDepartment = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!departmentForm.facultyId) {
			toast.error("Vui lòng chọn khoa trước khi lưu bộ môn");
			return;
		}

		if (departmentForm.departmentId > 0) {
			updateDepartmentMutation.mutate(departmentForm);
			return;
		}

		createDepartmentMutation.mutate({
			facultyId: departmentForm.facultyId,
			code: departmentForm.code,
			name: departmentForm.name,
			description: departmentForm.description,
		});
	};

	const beginCreateDepartment = () => {
		setIsCreatingDepartment(true);
		setSelectedDepartmentId(0);
		setDepartmentForm({
			...EMPTY_DEPARTMENT_FORM,
			facultyId: facultyOptions[0]?.id ?? 0,
		});
	};

	const handleDeleteDepartment = () => {
		if (!selectedDepartment) {
			toast.error("Vui lòng chọn bộ môn");
			return;
		}

		if (!confirm(`Xóa bộ môn ${selectedDepartment.name}?`)) {
			return;
		}

		deleteDepartmentMutation.mutate({ departmentId: selectedDepartment.id });
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
				pageTitle="Quản lý bộ môn"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý bộ môn."
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
			pageTitle="Quản lý bộ môn"
			pageDescription="Tạo, cập nhật, ngừng hoạt động và xóa bộ môn."
		>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
				<div className="grid gap-5 xl:grid-cols-[1fr_420px]">
					<Card>
						<CardHeader>
							<div className="flex items-start justify-between gap-3">
								<div>
									<CardTitle>Danh sách bộ môn</CardTitle>
									<CardDescription>
										Chọn một bộ môn để xem và chỉnh sửa thông tin, hoặc lọc theo khoa.
									</CardDescription>
								</div>
								{canCreate ? (
									<Button type="button" variant="outline" onClick={beginCreateDepartment}>
										<Plus data-icon="inline-start" />
										Thêm bộ môn
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
								<div className="flex flex-col gap-2 md:max-w-xs">
									<Label htmlFor="department-filter-faculty">Lọc theo khoa</Label>
									<select
										id="department-filter-faculty"
										className="border bg-background px-3 py-2 text-sm"
										value={selectedFacultyFilterId}
										onChange={(event) => {
											setSelectedFacultyFilterId(Number(event.target.value));
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
							</div>
							{departmentsQuery.isLoading || facultyOptionsQuery.isLoading ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-14 w-full" />
									<Skeleton className="h-14 w-full" />
									<Skeleton className="h-14 w-full" />
								</div>
							) : departmentsQuery.error || facultyOptionsQuery.error ? (
								<p className="text-destructive text-sm">
									Không thể tải dữ liệu bộ môn.
								</p>
							) : departments.length === 0 ? (
								<div className="border px-3 py-4 text-sm">
									Chưa có bộ môn nào trong hệ thống.
								</div>
							) : (
								<div className="flex flex-col gap-4">
									{departments.length === 0 ? (
										<div className="border px-3 py-4 text-sm">
											Không có bộ môn nào thuộc khoa đang lọc.
										</div>
									) : (
										<div className="overflow-x-auto border">
											<table className="w-full min-w-[820px] text-sm">
										<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
											<tr>
												<th className="p-3">Bộ môn</th>
												<th className="p-3">Khoa</th>
												<th className="p-3">Trạng thái</th>
											</tr>
										</thead>
												<tbody>
													{departments.map((item) => {
														const facultyOption = getFacultyOption(item.facultyId);

														return (
												<tr
													key={item.id}
													className={`cursor-pointer border-t transition-colors ${
														selectedDepartmentId === item.id
															? "bg-muted/50"
															: "hover:bg-muted/30"
													}`}
													onClick={() => {
														setIsCreatingDepartment(false);
														setSelectedDepartmentId(item.id);
													}}
												>
													<td className="p-3">
														<div className="font-medium">{item.name}</div>
														<div className="text-muted-foreground text-xs">
															{item.code}
														</div>
													</td>
													<td className="p-3">
														<div>{facultyOption?.name ?? "Không xác định"}</div>
														<div className="text-muted-foreground text-xs">
															{facultyOption?.code ?? `ID ${item.facultyId}`}
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
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>
								{departmentForm.departmentId > 0
									? "Cập nhật bộ môn"
									: "Tạo bộ môn"}
							</CardTitle>
							<CardDescription>
								{departmentForm.departmentId > 0
									? "Quản lý thông tin bộ môn và trạng thái hoạt động."
									: "Tạo bộ môn mới. Trạng thái mặc định sẽ là hoạt động."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSaveDepartment} className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<Label htmlFor="department-faculty">Khoa</Label>
									<select
										id="department-faculty"
										className="border bg-background px-3 py-2 text-sm"
										value={departmentForm.facultyId}
										onChange={(event) =>
											setDepartmentForm((current) => ({
												...current,
												facultyId: Number(event.target.value),
											}))
										}
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
									<Label htmlFor="department-code">Mã bộ môn</Label>
									<Input
										id="department-code"
										value={departmentForm.code}
										onChange={(event) =>
											setDepartmentForm((current) => ({
												...current,
												code: event.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="department-name">Tên bộ môn</Label>
									<Input
										id="department-name"
										value={departmentForm.name}
										onChange={(event) =>
											setDepartmentForm((current) => ({
												...current,
												name: event.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="department-description">Mô tả</Label>
									<textarea
										id="department-description"
										className="min-h-28 border bg-background px-3 py-2 text-sm"
										value={departmentForm.description}
										onChange={(event) =>
											setDepartmentForm((current) => ({
												...current,
												description: event.target.value,
											}))
										}
										required
									/>
								</div>
								{departmentForm.departmentId > 0 ? (
									<div className="flex flex-col gap-2">
										<Label htmlFor="department-status">Trạng thái</Label>
										<select
											id="department-status"
											className="border bg-background px-3 py-2 text-sm"
											value={departmentForm.status}
											onChange={(event) =>
												setDepartmentForm((current) => ({
													...current,
													status: event.target.value as DepartmentStatus,
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
												createDepartmentMutation.isPending ||
												updateDepartmentMutation.isPending
											}
										>
											<Save data-icon="inline-start" />
											{departmentForm.departmentId > 0
												? "Lưu bộ môn"
												: "Tạo bộ môn"}
										</Button>
									) : null}
									<Button type="button" variant="outline" onClick={beginCreateDepartment}>
										<Pencil data-icon="inline-start" />
										Form mới
									</Button>
									{canDelete && departmentForm.departmentId > 0 ? (
										<Button
											type="button"
											variant="outline"
											onClick={handleDeleteDepartment}
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
			</div>
		</AppShell>
	);
}
