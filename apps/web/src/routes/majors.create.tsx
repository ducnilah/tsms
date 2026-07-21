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
	EMPTY_MAJOR_FORM,
	MajorForm,
	type MajorFacultyOption,
	type MajorFormState,
} from "@/components/major-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/majors/create")({
	component: CreateMajorRoute,
});

function CreateMajorRoute() {
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
	const canCreate = hasPermission(permissionMap, "majors", "create");
	const [majorForm, setMajorForm] = useState<MajorFormState>(EMPTY_MAJOR_FORM);

	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const faculties = (facultiesQuery.data?.faculties ?? []) as MajorFacultyOption[];

	const createMajorMutation = useMutation(
		orpc["majors.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo ngành học");
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
			pageTitle="Tạo ngành học"
			pageDescription="Tạo mới ngành đào tạo và gắn ngành đó với một khoa quản lý."
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
							Chọn khoa quản lý, nhập mã ngành, tên ngành và mô tả nếu cần.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<MajorForm
							mode="create"
							value={majorForm}
							faculties={faculties}
							canSubmit={canCreate}
							isPending={createMajorMutation.isPending}
							onChange={setMajorForm}
							onSubmit={() => {
								if (!majorForm.facultyId) {
									toast.error("Vui lòng chọn khoa quản lý");
									return;
								}

								createMajorMutation.mutate({
									facultyId: majorForm.facultyId,
									code: majorForm.code,
									name: majorForm.name,
									description: majorForm.description,
								});
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
