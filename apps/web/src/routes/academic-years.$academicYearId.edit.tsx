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

import { AcademicYearForm, EMPTY_ACADEMIC_YEAR_FORM, type AcademicYearFormState } from "@/components/academic-year-form";
import { AppShell } from "@/components/app-shell";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/academic-years/$academicYearId/edit")({
	component: EditAcademicYearRoute,
});

function EditAcademicYearRoute() {
	const navigate = useNavigate();
	const { academicYearId } = Route.useParams();
	const numericAcademicYearId = Number(academicYearId);
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
	const canUpdate = hasPermission(permissionMap, "academic-years", "update");
	const [academicYearForm, setAcademicYearForm] =
		useState<AcademicYearFormState>(EMPTY_ACADEMIC_YEAR_FORM);

	const academicYearQuery = useQuery({
		...orpc["academicYears.byId"].queryOptions({
			input: { academicYearId: numericAcademicYearId },
		}),
		enabled: Boolean(currentUser) && numericAcademicYearId > 0,
	});

	useEffect(() => {
		const academicYear = academicYearQuery.data?.academicYear;
		if (!academicYear) return;

		setAcademicYearForm({
			code: academicYear.code,
			name: academicYear.name,
			startDate: academicYear.startDate,
			endDate: academicYear.endDate,
			status: academicYear.status as AcademicYearFormState["status"],
		});
	}, [academicYearQuery.data]);

	const updateAcademicYearMutation = useMutation(
		orpc["academicYears.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật năm học");
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
			pageTitle="Chỉnh sửa năm học"
			pageDescription="Cập nhật mốc thời gian và trạng thái của năm học."
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
							Bạn có thể đổi mã, tên, mốc thời gian và trạng thái năm học.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{academicYearQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : academicYearQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin năm học.
							</p>
						) : (
							<AcademicYearForm
								mode="edit"
								value={academicYearForm}
								canSubmit={canUpdate}
								isPending={updateAcademicYearMutation.isPending}
								onChange={setAcademicYearForm}
								onSubmit={() => {
									if (academicYearForm.endDate <= academicYearForm.startDate) {
										toast.error("Ngày kết thúc phải sau ngày bắt đầu");
										return;
									}

									updateAcademicYearMutation.mutate({
										academicYearId: numericAcademicYearId,
										...academicYearForm,
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
