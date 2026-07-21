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
	ClassroomForm,
	EMPTY_CLASSROOM_FORM,
	type ClassroomBuildingOption,
	type ClassroomFormState,
} from "@/components/classroom-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/classrooms/$classroomId/edit")({
	component: EditClassroomRoute,
});

function EditClassroomRoute() {
	const navigate = useNavigate();
	const { classroomId } = Route.useParams();
	const numericClassroomId = Number(classroomId);
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
	const canUpdate = hasPermission(permissionMap, "classrooms", "update");
	const [classroomForm, setClassroomForm] =
		useState<ClassroomFormState>(EMPTY_CLASSROOM_FORM);

	const classroomQuery = useQuery({
		...orpc["classrooms.byId"].queryOptions({
			input: { classroomId: numericClassroomId },
		}),
		enabled: Boolean(currentUser) && numericClassroomId > 0,
	});

	const buildingsQuery = useQuery({
		...orpc["buildings.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const buildings = (buildingsQuery.data?.buildings ?? []) as ClassroomBuildingOption[];

	useEffect(() => {
		const classroom = classroomQuery.data?.classroom;
		if (!classroom) return;

		setClassroomForm({
			code: classroom.code,
			buildingId: classroom.buildingId,
			capacity: classroom.capacity,
			type: classroom.type as ClassroomFormState["type"],
			status: classroom.status as ClassroomFormState["status"],
		});
	}, [classroomQuery.data]);

	const updateClassroomMutation = useMutation(
		orpc["classrooms.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật phòng học");
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
			pageTitle="Chỉnh sửa phòng học"
			pageDescription="Cập nhật thông tin phòng học, tòa nhà, loại phòng và trạng thái."
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
							Thay đổi mã phòng, tòa nhà, sức chứa, loại phòng hoặc trạng thái.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{classroomQuery.isLoading || buildingsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : classroomQuery.error || buildingsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin phòng học.
							</p>
						) : (
							<ClassroomForm
								mode="edit"
								value={classroomForm}
								buildings={buildings}
								canSubmit={canUpdate}
								isPending={updateClassroomMutation.isPending}
								onChange={setClassroomForm}
								onSubmit={() => {
									if (!classroomForm.buildingId) {
										toast.error("Vui lòng chọn tòa nhà");
										return;
									}

									updateClassroomMutation.mutate({
										classroomId: numericClassroomId,
										code: classroomForm.code,
										buildingId: classroomForm.buildingId,
										capacity: classroomForm.capacity,
										type: classroomForm.type,
										status: classroomForm.status,
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
