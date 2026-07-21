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
import { Skeleton } from "@tsms/ui/components/skeleton";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import {
	EMPTY_LECTURER_FORM,
	LecturerForm,
	type LecturerDepartmentOption,
	type LecturerFacultyOption,
	type LecturerFormState,
} from "@/components/lecturer-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/lecturers/$lecturerId/edit")({
	component: EditLecturerRoute,
});

function toDateInput(value: string | Date) {
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}

	return String(value).slice(0, 10);
}

function EditLecturerRoute() {
	const navigate = useNavigate();
	const { lecturerId } = Route.useParams();
	const numericLecturerId = Number(lecturerId);
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
	const canUpdate = hasPermission(permissionMap, "lecturers", "update");
	const [lecturerForm, setLecturerForm] =
		useState<LecturerFormState>(EMPTY_LECTURER_FORM);

	const lecturerQuery = useQuery({
		...orpc["lecturers.byId"].queryOptions({
			input: { lecturerId: numericLecturerId },
		}),
		enabled: Boolean(currentUser) && numericLecturerId > 0,
	});
	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const departmentsQuery = useQuery({
		...orpc["departments.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const faculties = (facultiesQuery.data?.faculties ?? []) as LecturerFacultyOption[];
	const departments = (departmentsQuery.data?.departments ??
		[]) as LecturerDepartmentOption[];

	useEffect(() => {
		const lecturer = lecturerQuery.data?.lecturer;
		if (!lecturer) return;

		const selectedDepartment = departments.find(
			(item) => item.id === lecturer.departmentId,
		);

		setLecturerForm({
			name: lecturer.name,
			dob: toDateInput(lecturer.dob),
			email: lecturer.email,
			phone: lecturer.phone,
			position: lecturer.position,
			facultyId: selectedDepartment?.facultyId ?? 0,
			departmentId: lecturer.departmentId,
			status: lecturer.status as LecturerFormState["status"],
		});
	}, [departments, lecturerQuery.data]);

	const updateLecturerMutation = useMutation(
		orpc["lecturers.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật giảng viên");
				await queryClient.invalidateQueries();
				navigate({ to: "/lecturers" });
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSubmit = () => {
		if (!lecturerForm.departmentId) {
			toast.error("Vui lòng chọn bộ môn");
			return;
		}

		updateLecturerMutation.mutate({
			lecturerId: numericLecturerId,
			name: lecturerForm.name,
			dob: lecturerForm.dob,
			email: lecturerForm.email,
			phone: lecturerForm.phone,
			departmentId: lecturerForm.departmentId,
			position: lecturerForm.position,
			status: lecturerForm.status,
		});
	};

	if (meQuery.isLoading && !currentUser) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return <main className="p-6 text-sm">Đang kiểm tra phiên đăng nhập...</main>;
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Chỉnh sửa giảng viên"
			pageDescription="Cập nhật hồ sơ, bộ môn và trạng thái giảng viên."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<div>
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/lecturers" })}
					>
						<ArrowLeft data-icon="inline-start" />
						Quay lại danh sách
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin giảng viên</CardTitle>
						<CardDescription>
							Cập nhật thông tin cá nhân, liên hệ và bộ môn chủ quản.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{lecturerQuery.isLoading ||
						facultiesQuery.isLoading ||
						departmentsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : lecturerQuery.error || facultiesQuery.error || departmentsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin giảng viên.
							</p>
						) : (
							<LecturerForm
								mode="edit"
								value={lecturerForm}
								faculties={faculties}
								departments={departments}
								canSubmit={canUpdate}
								isPending={updateLecturerMutation.isPending}
								onChange={setLecturerForm}
								onSubmit={handleSubmit}
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
