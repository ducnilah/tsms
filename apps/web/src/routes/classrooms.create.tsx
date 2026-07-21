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
	ClassroomForm,
	EMPTY_CLASSROOM_FORM,
	type ClassroomBuildingOption,
	type ClassroomFormState,
} from "@/components/classroom-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/classrooms/create")({
	component: CreateClassroomRoute,
});

function CreateClassroomRoute() {
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
	const canCreate = hasPermission(permissionMap, "classrooms", "create");
	const [classroomForm, setClassroomForm] =
		useState<ClassroomFormState>(EMPTY_CLASSROOM_FORM);

	const buildingsQuery = useQuery({
		...orpc["buildings.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const buildings = (buildingsQuery.data?.buildings ?? []) as ClassroomBuildingOption[];

	const createClassroomMutation = useMutation(
		orpc["classrooms.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo phòng học");
				await queryClient.invalidateQueries();
				navigate({ to: "/classrooms" });
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
			pageTitle="Tạo phòng học"
			pageDescription="Tạo mới phòng học và gắn phòng đó với một tòa nhà."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<Button
					type="button"
					variant="outline"
					onClick={() => navigate({ to: "/classrooms" })}
				>
					<ArrowLeft data-icon="inline-start" />
					Quay lại danh sách
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin phòng học</CardTitle>
						<CardDescription>
							Nhập mã phòng, tòa nhà, loại phòng và sức chứa.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ClassroomForm
							mode="create"
							value={classroomForm}
							buildings={buildings}
							canSubmit={canCreate}
							isPending={createClassroomMutation.isPending}
							onChange={setClassroomForm}
							onSubmit={() => {
								if (!classroomForm.buildingId) {
									toast.error("Vui lòng chọn tòa nhà");
									return;
								}

								createClassroomMutation.mutate({
									code: classroomForm.code,
									buildingId: classroomForm.buildingId,
									capacity: classroomForm.capacity,
									type: classroomForm.type,
								});
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
