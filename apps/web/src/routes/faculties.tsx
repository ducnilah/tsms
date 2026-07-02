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

export const Route = createFileRoute("/faculties")({
	component: FacultiesRoute,
});

type FacultyStatus = "active" | "inactive";

type FacultyItem = {
	id: number;
	code: string;
	name: string;
	description: string;
	status: FacultyStatus;
	departmentCount: number;
	studentClassCount: number;
};

type FacultyFormState = {
	facultyId: number;
	code: string;
	name: string;
	description: string;
	status: FacultyStatus;
};

const EMPTY_FACULTY_FORM: FacultyFormState = {
	facultyId: 0,
	code: "",
	name: "",
	description: "",
	status: "active",
};

function FacultiesRoute() {
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
	const canRead = hasPermission(permissionMap, "faculties", "read");
	const canCreate = hasPermission(permissionMap, "faculties", "create");
	const canUpdate = hasPermission(permissionMap, "faculties", "update");
	const canDelete = hasPermission(permissionMap, "faculties", "delete");

	const facultiesQuery = useQuery({
		...orpc["faculties.list"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const [selectedFacultyId, setSelectedFacultyId] = useState(0);
	const [isCreatingFaculty, setIsCreatingFaculty] = useState(false);
	const [facultyForm, setFacultyForm] =
		useState<FacultyFormState>(EMPTY_FACULTY_FORM);

	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyItem[];
	const selectedFaculty = useMemo(
		() => faculties.find((item) => item.id === selectedFacultyId) ?? null,
		[faculties, selectedFacultyId],
	);

	useEffect(() => {
		if (!isCreatingFaculty && selectedFacultyId === 0 && faculties.length > 0) {
			setSelectedFacultyId(faculties[0].id);
		}
	}, [faculties, isCreatingFaculty, selectedFacultyId]);

	useEffect(() => {
		if (faculties.length === 0) {
			setSelectedFacultyId(0);
			if (!isCreatingFaculty) {
				setFacultyForm(EMPTY_FACULTY_FORM);
			}
			return;
		}

		if (
			!isCreatingFaculty &&
			!faculties.some((item) => item.id === selectedFacultyId)
		) {
			setSelectedFacultyId(faculties[0].id);
		}
	}, [faculties, isCreatingFaculty, selectedFacultyId]);

	useEffect(() => {
		if (isCreatingFaculty || !selectedFaculty) {
			return;
		}

		setFacultyForm({
			facultyId: selectedFaculty.id,
			code: selectedFaculty.code,
			name: selectedFaculty.name,
			description: selectedFaculty.description,
			status: selectedFaculty.status,
		});
	}, [isCreatingFaculty, selectedFaculty]);

	const invalidateManagementQueries = async () => {
		await queryClient.invalidateQueries();
	};

	const createFacultyMutation = useMutation(
		orpc["faculties.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo khoa");
				setIsCreatingFaculty(false);
				setSelectedFacultyId(data.faculty.id);
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateFacultyMutation = useMutation(
		orpc["faculties.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật khoa");
				setIsCreatingFaculty(false);
				setSelectedFacultyId(data.faculty.id);
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteFacultyMutation = useMutation(
		orpc["faculties.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa khoa");
				setIsCreatingFaculty(false);
				setFacultyForm(EMPTY_FACULTY_FORM);
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSaveFaculty = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (facultyForm.facultyId > 0) {
			updateFacultyMutation.mutate(facultyForm);
			return;
		}

		createFacultyMutation.mutate({
			code: facultyForm.code,
			name: facultyForm.name,
			description: facultyForm.description,
		});
	};

	const beginCreateFaculty = () => {
		setIsCreatingFaculty(true);
		setSelectedFacultyId(0);
		setFacultyForm(EMPTY_FACULTY_FORM);
	};

	const handleDeleteFaculty = () => {
		if (!selectedFaculty) {
			toast.error("Vui lòng chọn khoa");
			return;
		}

		if (!confirm(`Xóa khoa ${selectedFaculty.name}?`)) {
			return;
		}

		deleteFacultyMutation.mutate({ facultyId: selectedFaculty.id });
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
				pageTitle="Quản lý khoa"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý khoa."
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
			pageTitle="Quản lý khoa"
			pageDescription="Tạo, cập nhật, ngừng hoạt động và xóa khoa."
		>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
				<div className="grid gap-5 xl:grid-cols-[360px_1fr]">
					<Card>
						<CardHeader>
							<div className="flex items-start justify-between gap-3">
								<div>
									<CardTitle>Danh sách khoa</CardTitle>
									<CardDescription>
										Chọn một khoa để xem và chỉnh sửa thông tin.
									</CardDescription>
								</div>
								{canCreate ? (
									<Button type="button" variant="outline" onClick={beginCreateFaculty}>
										<Plus data-icon="inline-start" />
										Thêm khoa
									</Button>
								) : null}
							</div>
						</CardHeader>
						<CardContent>
							{facultiesQuery.isLoading ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-12 w-full" />
									<Skeleton className="h-12 w-full" />
									<Skeleton className="h-12 w-full" />
								</div>
							) : facultiesQuery.error ? (
								<p className="text-destructive text-sm">
									Không thể tải danh sách khoa.
								</p>
							) : faculties.length === 0 ? (
								<div className="border px-3 py-4 text-sm">
									Chưa có khoa nào trong hệ thống.
								</div>
							) : (
								<div className="flex flex-col gap-2">
									{faculties.map((item) => (
										<button
											key={item.id}
											type="button"
											onClick={() => {
												setIsCreatingFaculty(false);
												setSelectedFacultyId(item.id);
											}}
											className={`flex flex-col items-start gap-1 border px-3 py-3 text-left text-sm transition-colors ${
												selectedFacultyId === item.id
													? "border-foreground bg-muted"
													: "hover:bg-muted/60"
											}`}
										>
											<div className="flex w-full items-center justify-between gap-2">
												<span className="font-medium">{item.name}</span>
												<span className="border px-2 py-1 text-[10px] uppercase">
													{item.status}
												</span>
											</div>
											<span className="text-muted-foreground text-xs">
												{item.code} • {item.departmentCount} bộ môn •{" "}
												{item.studentClassCount} lớp
											</span>
										</button>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>
								{facultyForm.facultyId > 0 ? "Cập nhật khoa" : "Tạo khoa"}
							</CardTitle>
							<CardDescription>
								{facultyForm.facultyId > 0
									? "Quản lý thông tin cơ bản và trạng thái hoạt động của khoa."
									: "Tạo khoa mới. Trạng thái mặc định sẽ là hoạt động."}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSaveFaculty} className="flex flex-col gap-4">
								<div className="flex flex-col gap-2">
									<Label htmlFor="faculty-code">Mã khoa</Label>
									<Input
										id="faculty-code"
										value={facultyForm.code}
										onChange={(event) =>
											setFacultyForm((current) => ({
												...current,
												code: event.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="faculty-name">Tên khoa</Label>
									<Input
										id="faculty-name"
										value={facultyForm.name}
										onChange={(event) =>
											setFacultyForm((current) => ({
												...current,
												name: event.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="faculty-description">Mô tả</Label>
									<textarea
										id="faculty-description"
										className="min-h-28 border bg-background px-3 py-2 text-sm"
										value={facultyForm.description}
										onChange={(event) =>
											setFacultyForm((current) => ({
												...current,
												description: event.target.value,
											}))
										}
										required
									/>
								</div>
								{facultyForm.facultyId > 0 ? (
									<div className="flex flex-col gap-2">
										<Label htmlFor="faculty-status">Trạng thái</Label>
										<select
											id="faculty-status"
											className="border bg-background px-3 py-2 text-sm"
											value={facultyForm.status}
											onChange={(event) =>
												setFacultyForm((current) => ({
													...current,
													status: event.target.value as FacultyStatus,
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
												createFacultyMutation.isPending ||
												updateFacultyMutation.isPending
											}
										>
											<Save data-icon="inline-start" />
											{facultyForm.facultyId > 0 ? "Lưu khoa" : "Tạo khoa"}
										</Button>
									) : null}
									<Button type="button" variant="outline" onClick={beginCreateFaculty}>
										<Pencil data-icon="inline-start" />
										Form mới
									</Button>
									{canDelete && facultyForm.facultyId > 0 ? (
										<Button type="button" variant="outline" onClick={handleDeleteFaculty}>
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
