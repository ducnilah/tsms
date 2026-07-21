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
	EMPTY_MAJOR_FORM,
	MajorForm,
	type MajorFacultyOption,
	type MajorFormState,
} from "@/components/major-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/majors/$majorId/edit")({
	component: EditMajorRoute,
});

function EditMajorRoute() {
	const navigate = useNavigate();
	const { majorId } = Route.useParams();
	const numericMajorId = Number(majorId);
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
	const canUpdate = hasPermission(permissionMap, "majors", "update");
	const [majorForm, setMajorForm] = useState<MajorFormState>(EMPTY_MAJOR_FORM);

	const majorQuery = useQuery({
		...orpc["majors.byId"].queryOptions({
			input: { majorId: numericMajorId },
		}),
		enabled: Boolean(currentUser) && numericMajorId > 0,
	});

	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const faculties = (facultiesQuery.data?.faculties ?? []) as MajorFacultyOption[];

	useEffect(() => {
		const major = majorQuery.data?.major;
		if (!major) return;

		setMajorForm({
			facultyId: major.facultyId,
			code: major.code,
			name: major.name,
			description: major.description ?? "",
			status: major.status as MajorFormState["status"],
		});
	}, [majorQuery.data]);

	const updateMajorMutation = useMutation(
		orpc["majors.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật ngành học");
				await queryClient.invalidateQueries();
				navigate({ to: "/majors" });
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
			pageTitle="Chỉnh sửa ngành học"
			pageDescription="Cập nhật thông tin ngành đào tạo, khoa quản lý và trạng thái hoạt động."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<div>
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/majors" })}
					>
						<ArrowLeft data-icon="inline-start" />
						Quay lại danh sách
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin ngành học</CardTitle>
						<CardDescription>
							Bạn có thể đổi khoa quản lý, mã, tên, mô tả và trạng thái ngành học.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{majorQuery.isLoading || facultiesQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : majorQuery.error || facultiesQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin ngành học.
							</p>
						) : (
							<MajorForm
								mode="edit"
								value={majorForm}
								faculties={faculties}
								canSubmit={canUpdate}
								isPending={updateMajorMutation.isPending}
								onChange={setMajorForm}
								onSubmit={() => {
									if (!majorForm.facultyId) {
										toast.error("Vui lòng chọn khoa quản lý");
										return;
									}

									updateMajorMutation.mutate({
										majorId: numericMajorId,
										facultyId: majorForm.facultyId,
										code: majorForm.code,
										name: majorForm.name,
										description: majorForm.description,
										status: majorForm.status,
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
