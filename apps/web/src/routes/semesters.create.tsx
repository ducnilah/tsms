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
	EMPTY_SEMESTER_FORM,
	SemesterForm,
	type AcademicYearOption,
	type SemesterFormState,
} from "@/components/semester-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/semesters/create")({
	component: CreateSemesterRoute,
});

function CreateSemesterRoute() {
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
	const canCreate = hasPermission(permissionMap, "semesters", "create");
	const [semesterForm, setSemesterForm] =
		useState<SemesterFormState>(EMPTY_SEMESTER_FORM);

	const academicYearsQuery = useQuery({
		...orpc["academicYears.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const academicYears = (academicYearsQuery.data?.academicYears ??
		[]) as AcademicYearOption[];

	const createSemesterMutation = useMutation(
		orpc["semesters.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo học kỳ");
				await queryClient.invalidateQueries();
				navigate({ to: "/semesters" });
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
			pageTitle="Tạo học kỳ"
			pageDescription="Tạo học kỳ mới; hệ thống sẽ tự sinh các tuần học từ ngày bắt đầu đến ngày kết thúc."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<Button type="button" variant="outline" onClick={() => navigate({ to: "/semesters" })}>
					<ArrowLeft data-icon="inline-start" />
					Quay lại danh sách
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin học kỳ</CardTitle>
						<CardDescription>
							Ngày học kỳ phải nằm trong khoảng thời gian của năm học đã chọn.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<SemesterForm
							mode="create"
							value={semesterForm}
							academicYears={academicYears}
							canSubmit={canCreate}
							isPending={createSemesterMutation.isPending}
							onChange={setSemesterForm}
							onSubmit={() => {
								if (!semesterForm.academicYearId) {
									toast.error("Vui lòng chọn năm học");
									return;
								}

								if (semesterForm.endDate <= semesterForm.startDate) {
									toast.error("Ngày kết thúc phải sau ngày bắt đầu");
									return;
								}

								createSemesterMutation.mutate(semesterForm);
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
