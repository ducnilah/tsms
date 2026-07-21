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
	DepartmentForm,
	EMPTY_DEPARTMENT_FORM,
	type DepartmentFormState,
	type FacultyOption,
} from "@/components/department-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/departments/$departmentId/edit")({
	component: EditDepartmentRoute,
});

function EditDepartmentRoute() {
	const navigate = useNavigate();
	const { departmentId } = Route.useParams();
	const numericDepartmentId = Number(departmentId);
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
	const canUpdate = hasPermission(permissionMap, "departments", "update");
	const [departmentForm, setDepartmentForm] =
		useState<DepartmentFormState>(EMPTY_DEPARTMENT_FORM);

	const departmentQuery = useQuery({
		...orpc["departments.byId"].queryOptions({
			input: { departmentId: numericDepartmentId },
		}),
		enabled: Boolean(currentUser) && numericDepartmentId > 0,
	});

	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];

	useEffect(() => {
		const department = departmentQuery.data?.department;
		if (!department) return;

		setDepartmentForm({
			facultyId: department.facultyId,
			code: department.code,
			name: department.name,
			description: department.description ?? "",
			status: department.status as DepartmentFormState["status"],
		});
	}, [departmentQuery.data]);

	const updateDepartmentMutation = useMutation(
		orpc["departments.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật bộ môn");
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
			pageTitle="Chỉnh sửa bộ môn"
			pageDescription="Cập nhật thông tin bộ môn và trạng thái hoạt động."
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
							Bạn có thể đổi khoa chủ quản, mã, tên, mô tả và trạng thái bộ môn.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{departmentQuery.isLoading || facultiesQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : departmentQuery.error || facultiesQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin bộ môn.
							</p>
						) : (
							<DepartmentForm
								mode="edit"
								value={departmentForm}
								faculties={faculties}
								canSubmit={canUpdate}
								isPending={updateDepartmentMutation.isPending}
								onChange={setDepartmentForm}
								onSubmit={() => {
									if (!departmentForm.facultyId) {
										toast.error("Vui lòng chọn khoa");
										return;
									}

									updateDepartmentMutation.mutate({
										departmentId: numericDepartmentId,
										facultyId: departmentForm.facultyId,
										code: departmentForm.code,
										name: departmentForm.name,
										description: departmentForm.description,
										status: departmentForm.status,
									});
								}}
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
