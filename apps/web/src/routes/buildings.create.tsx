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
	BuildingForm,
	EMPTY_BUILDING_FORM,
	type BuildingFormState,
} from "@/components/building-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/buildings/create")({
	component: CreateBuildingRoute,
});

function CreateBuildingRoute() {
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
	const canCreate = hasPermission(permissionMap, "buildings", "create");
	const [buildingForm, setBuildingForm] =
		useState<BuildingFormState>(EMPTY_BUILDING_FORM);

	const createBuildingMutation = useMutation(
		orpc["buildings.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo tòa nhà");
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
			pageTitle="Tạo tòa nhà"
			pageDescription="Tạo mới tòa nhà để phục vụ quản lý phòng học."
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
						<CardDescription>Nhập mã tòa nhà cần quản lý.</CardDescription>
					</CardHeader>
					<CardContent>
						<BuildingForm
							mode="create"
							value={buildingForm}
							canSubmit={canCreate}
							isPending={createBuildingMutation.isPending}
							onChange={setBuildingForm}
							onSubmit={() =>
								createBuildingMutation.mutate({
									code: buildingForm.code,
								})
							}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
