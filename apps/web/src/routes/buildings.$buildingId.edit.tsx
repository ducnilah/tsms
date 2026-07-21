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
	BuildingForm,
	EMPTY_BUILDING_FORM,
	type BuildingFormState,
} from "@/components/building-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/buildings/$buildingId/edit")({
	component: EditBuildingRoute,
});

function EditBuildingRoute() {
	const navigate = useNavigate();
	const { buildingId } = Route.useParams();
	const numericBuildingId = Number(buildingId);
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
	const canUpdate = hasPermission(permissionMap, "buildings", "update");
	const [buildingForm, setBuildingForm] =
		useState<BuildingFormState>(EMPTY_BUILDING_FORM);

	const buildingQuery = useQuery({
		...orpc["buildings.byId"].queryOptions({
			input: { buildingId: numericBuildingId },
		}),
		enabled: Boolean(currentUser) && numericBuildingId > 0,
	});

	useEffect(() => {
		const building = buildingQuery.data?.building;
		if (!building) return;

		setBuildingForm({
			code: building.code,
			status: building.status as BuildingFormState["status"],
		});
	}, [buildingQuery.data]);

	const updateBuildingMutation = useMutation(
		orpc["buildings.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật tòa nhà");
				await queryClient.invalidateQueries();
				navigate({ to: "/buildings" });
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
			pageTitle="Chỉnh sửa tòa nhà"
			pageDescription="Cập nhật mã tòa nhà và trạng thái hoạt động."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<Button
					type="button"
					variant="outline"
					onClick={() => navigate({ to: "/buildings" })}
				>
					<ArrowLeft data-icon="inline-start" />
					Quay lại danh sách
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin tòa nhà</CardTitle>
						<CardDescription>
							Thay đổi mã tòa nhà hoặc trạng thái hiển thị trong hệ thống.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{buildingQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : buildingQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin tòa nhà.
							</p>
						) : (
							<BuildingForm
								mode="edit"
								value={buildingForm}
								canSubmit={canUpdate}
								isPending={updateBuildingMutation.isPending}
								onChange={setBuildingForm}
								onSubmit={() =>
									updateBuildingMutation.mutate({
										buildingId: numericBuildingId,
										code: buildingForm.code,
										status: buildingForm.status,
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
