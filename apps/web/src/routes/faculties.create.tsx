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
	EMPTY_FACULTY_FORM,
	FacultyForm,
	type FacultyFormState,
} from "@/components/faculty-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/faculties/create")({
	component: CreateFacultyRoute,
});

function CreateFacultyRoute() {
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
	const canCreate = hasPermission(permissionMap, "faculties", "create");
	const [facultyForm, setFacultyForm] =
		useState<FacultyFormState>(EMPTY_FACULTY_FORM);

	const createFacultyMutation = useMutation(
		orpc["faculties.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo khoa");
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
			pageTitle="Tạo khoa"
			pageDescription="Tạo mới thông tin khoa trong hệ thống."
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
							Điền mã khoa, tên khoa và mô tả. Trạng thái mặc định là đang hoạt động.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<FacultyForm
							mode="create"
							value={facultyForm}
							canSubmit={canCreate}
							isPending={createFacultyMutation.isPending}
							onChange={setFacultyForm}
							onSubmit={() =>
								createFacultyMutation.mutate({
									code: facultyForm.code,
									name: facultyForm.name,
									description: facultyForm.description.trim() || undefined,
								})
							}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
