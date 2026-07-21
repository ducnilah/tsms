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
	EMPTY_SEMESTER_FORM,
	SemesterForm,
	type AcademicYearOption,
	type SemesterFormState,
} from "@/components/semester-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/semesters/$semesterId/edit")({
	component: EditSemesterRoute,
});

function EditSemesterRoute() {
	const navigate = useNavigate();
	const { semesterId } = Route.useParams();
	const numericSemesterId = Number(semesterId);
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
	const canUpdate = hasPermission(permissionMap, "semesters", "update");
	const [semesterForm, setSemesterForm] =
		useState<SemesterFormState>(EMPTY_SEMESTER_FORM);

	const semesterQuery = useQuery({
		...orpc["semesters.byId"].queryOptions({
			input: { semesterId: numericSemesterId },
		}),
		enabled: Boolean(currentUser) && numericSemesterId > 0,
	});

	const academicYearsQuery = useQuery({
		...orpc["academicYears.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const academicYears = (academicYearsQuery.data?.academicYears ??
		[]) as AcademicYearOption[];

	useEffect(() => {
		const semester = semesterQuery.data?.semester;
		if (!semester) return;

		setSemesterForm({
			academicYearId: semester.academicYearId,
			code: semester.code,
			name: semester.name,
			type: semester.type as SemesterFormState["type"],
			startDate: semester.startDate,
			endDate: semester.endDate,
			status: semester.status as SemesterFormState["status"],
		});
	}, [semesterQuery.data]);

	const updateSemesterMutation = useMutation(
		orpc["semesters.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật học kỳ");
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
			pageTitle="Chỉnh sửa học kỳ"
			pageDescription="Cập nhật mốc thời gian, loại học kỳ và trạng thái học kỳ."
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
							Khi đổi thời gian học kỳ, hãy kiểm tra lại các tuần học liên quan.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{semesterQuery.isLoading || academicYearsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : semesterQuery.error || academicYearsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin học kỳ.
							</p>
						) : (
							<SemesterForm
								mode="edit"
								value={semesterForm}
								academicYears={academicYears}
								canSubmit={canUpdate}
								isPending={updateSemesterMutation.isPending}
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

									updateSemesterMutation.mutate({
										semesterId: numericSemesterId,
										...semesterForm,
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
