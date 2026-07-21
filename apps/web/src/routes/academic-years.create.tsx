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

import { AcademicYearForm, EMPTY_ACADEMIC_YEAR_FORM, type AcademicYearFormState } from "@/components/academic-year-form";
import { AppShell } from "@/components/app-shell";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/academic-years/create")({
	component: CreateAcademicYearRoute,
});

function CreateAcademicYearRoute() {
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
	const canCreate = hasPermission(permissionMap, "academic-years", "create");
	const [academicYearForm, setAcademicYearForm] =
		useState<AcademicYearFormState>(EMPTY_ACADEMIC_YEAR_FORM);

	const createAcademicYearMutation = useMutation(
		orpc["academicYears.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo năm học");
				await queryClient.invalidateQueries();
				navigate({ to: "/academic-years" });
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
			pageTitle="Tạo năm học"
			pageDescription="Tạo mới năm học với mốc thời gian bắt đầu và kết thúc."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<Button type="button" variant="outline" onClick={() => navigate({ to: "/academic-years" })}>
					<ArrowLeft data-icon="inline-start" />
					Quay lại danh sách
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin năm học</CardTitle>
						<CardDescription>
							Nhập mã, tên, thời gian và trạng thái khởi tạo của năm học.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<AcademicYearForm
							mode="create"
							value={academicYearForm}
							canSubmit={canCreate}
							isPending={createAcademicYearMutation.isPending}
							onChange={setAcademicYearForm}
							onSubmit={() => {
								if (academicYearForm.endDate <= academicYearForm.startDate) {
									toast.error("Ngày kết thúc phải sau ngày bắt đầu");
									return;
								}

								createAcademicYearMutation.mutate(academicYearForm);
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
