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
	EMPTY_FACULTY_FORM,
	FacultyForm,
	type FacultyFormState,
} from "@/components/faculty-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/faculties/$facultyId/edit")({
	component: EditFacultyRoute,
});

function EditFacultyRoute() {
	const { facultyId } = Route.useParams();
	const facultyIdNumber = Number(facultyId);
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
	const canUpdate = hasPermission(permissionMap, "faculties", "update");
	const [facultyForm, setFacultyForm] =
		useState<FacultyFormState>(EMPTY_FACULTY_FORM);

	const facultyQuery = useQuery({
		...orpc["faculties.byId"].queryOptions({
			input: { facultyId: facultyIdNumber },
		}),
		enabled: Boolean(currentUser) && canRead && Number.isInteger(facultyIdNumber),
		meta: { skipErrorToast: !canRead },
	});

	useEffect(() => {
		const faculty = facultyQuery.data?.faculty;
		if (!faculty) return;

		setFacultyForm({
			code: faculty.code,
			name: faculty.name,
			description: faculty.description ?? "",
			status: faculty.status as FacultyFormState["status"],
		});
	}, [facultyQuery.data]);

	const updateFacultyMutation = useMutation(
		orpc["faculties.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật khoa");
				await queryClient.invalidateQueries();
				navigate({ to: "/faculties" });
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
			pageTitle="Chỉnh sửa khoa"
			pageDescription="Cập nhật thông tin và trạng thái hoạt động của khoa."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<div>
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/faculties" })}
					>
						<ArrowLeft data-icon="inline-start" />
						Quay lại danh sách
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin khoa</CardTitle>
						<CardDescription>
							Chỉnh sửa mã khoa, tên khoa, mô tả và trạng thái.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{facultyQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : facultyQuery.error ? (
							<p className="text-destructive text-sm">Không thể tải thông tin khoa.</p>
						) : (
							<FacultyForm
								mode="edit"
								value={facultyForm}
								canSubmit={canUpdate}
								isPending={updateFacultyMutation.isPending}
								onChange={setFacultyForm}
								onSubmit={() =>
									updateFacultyMutation.mutate({
										facultyId: facultyIdNumber,
										code: facultyForm.code,
										name: facultyForm.name,
										description: facultyForm.description.trim() || undefined,
										status: facultyForm.status,
									})
								}
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
