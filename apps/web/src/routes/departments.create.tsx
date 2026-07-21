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
	DepartmentForm,
	EMPTY_DEPARTMENT_FORM,
	type DepartmentFormState,
	type FacultyOption,
} from "@/components/department-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/departments/create")({
	component: CreateDepartmentRoute,
});

function CreateDepartmentRoute() {
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
	const canCreate = hasPermission(permissionMap, "departments", "create");
	const [departmentForm, setDepartmentForm] =
		useState<DepartmentFormState>(EMPTY_DEPARTMENT_FORM);

	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];

	const createDepartmentMutation = useMutation(
		orpc["departments.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo bộ môn");
				await queryClient.invalidateQueries();
				navigate({ to: "/departments" });
			},
			onError: (error) => toast.error(error.message),
		}),
	);

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
			pageTitle="Tạo bộ môn"
			pageDescription="Tạo mới bộ môn trực thuộc một khoa."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<div>
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/departments" })}
					>
						<ArrowLeft data-icon="inline-start" />
						Quay lại danh sách
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin bộ môn</CardTitle>
						<CardDescription>
							Chọn khoa chủ quản, nhập mã bộ môn, tên bộ môn và mô tả.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<DepartmentForm
							mode="create"
							value={departmentForm}
							faculties={faculties}
							canSubmit={canCreate}
							isPending={createDepartmentMutation.isPending}
							onChange={setDepartmentForm}
							onSubmit={() => {
								if (!departmentForm.facultyId) {
									toast.error("Vui lòng chọn khoa");
									return;
								}

								createDepartmentMutation.mutate({
									facultyId: departmentForm.facultyId,
									code: departmentForm.code,
									name: departmentForm.name,
									description: departmentForm.description,
								});
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
