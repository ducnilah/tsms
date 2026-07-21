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

export const Route = createFileRoute("/lecturers/create")({
	component: CreateLecturerRoute,
});

function CreateLecturerRoute() {
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
	const canCreate = hasPermission(permissionMap, "lecturers", "create");
	const [lecturerForm, setLecturerForm] =
		useState<LecturerFormState>(EMPTY_LECTURER_FORM);

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

	const createLecturerMutation = useMutation(
		orpc["lecturers.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo giảng viên");
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

		createLecturerMutation.mutate({
			name: lecturerForm.name,
			dob: lecturerForm.dob,
			email: lecturerForm.email,
			phone: lecturerForm.phone,
			departmentId: lecturerForm.departmentId,
			position: lecturerForm.position,
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
			pageTitle="Tạo giảng viên"
			pageDescription="Tạo mới hồ sơ giảng viên và gán về bộ môn quản lý."
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
							Chọn khoa, bộ môn và nhập thông tin liên hệ của giảng viên.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<LecturerForm
							mode="create"
							value={lecturerForm}
							faculties={faculties}
							departments={departments}
							canSubmit={canCreate}
							isPending={createLecturerMutation.isPending}
							onChange={setLecturerForm}
							onSubmit={handleSubmit}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
