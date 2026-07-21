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

import {
	AcademicHolidayForm,
	EMPTY_ACADEMIC_HOLIDAY_FORM,
	type AcademicHolidayFormState,
	type SemesterOption,
} from "@/components/academic-holiday-form";
import { AppShell } from "@/components/app-shell";
import { type AcademicYearOption } from "@/components/semester-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/academic-holidays/$academicHolidayId/edit")({
	component: EditAcademicHolidayRoute,
});

function EditAcademicHolidayRoute() {
	const navigate = useNavigate();
	const { academicHolidayId } = Route.useParams();
	const numericAcademicHolidayId = Number(academicHolidayId);
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
	const canUpdate = hasPermission(permissionMap, "academic-holidays", "update");
	const [holidayForm, setHolidayForm] =
		useState<AcademicHolidayFormState>(EMPTY_ACADEMIC_HOLIDAY_FORM);

	const holidayQuery = useQuery({
		...orpc["academicHolidays.byId"].queryOptions({
			input: { holidayId: numericAcademicHolidayId },
		}),
		enabled: Boolean(currentUser) && numericAcademicHolidayId > 0,
	});
	const academicYearsQuery = useQuery({
		...orpc["academicYears.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const semestersQuery = useQuery({
		...orpc["semesters.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const academicYears = (academicYearsQuery.data?.academicYears ??
		[]) as AcademicYearOption[];
	const semesters = (semestersQuery.data?.semesters ?? []) as SemesterOption[];

	useEffect(() => {
		const holiday = holidayQuery.data?.holiday;
		if (!holiday) return;

		setHolidayForm({
			academicYearId: holiday.academicYearId,
			semesterId: holiday.semesterId ?? 0,
			name: holiday.name,
			type: holiday.type as AcademicHolidayFormState["type"],
			startDate: holiday.startDate,
			endDate: holiday.endDate,
			status: holiday.status as AcademicHolidayFormState["status"],
		});
	}, [holidayQuery.data]);

	const updateHolidayMutation = useMutation(
		orpc["academicHolidays.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật ngày nghỉ/lễ");
				await queryClient.invalidateQueries();
				navigate({ to: "/academic-holidays" });
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
			pageTitle="Chỉnh sửa ngày nghỉ/lễ"
			pageDescription="Cập nhật phạm vi áp dụng, loại mốc thời gian và trạng thái ngày nghỉ/lễ."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<Button
					type="button"
					variant="outline"
					onClick={() => navigate({ to: "/academic-holidays" })}
				>
					<ArrowLeft data-icon="inline-start" />
					Quay lại danh sách
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin ngày nghỉ/lễ</CardTitle>
						<CardDescription>
							Ngày nghỉ/lễ phải nằm trong năm học và học kỳ nếu có chọn học kỳ.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{holidayQuery.isLoading ||
						academicYearsQuery.isLoading ||
						semestersQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : holidayQuery.error ||
						  academicYearsQuery.error ||
						  semestersQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin ngày nghỉ/lễ.
							</p>
						) : (
							<AcademicHolidayForm
								mode="edit"
								value={holidayForm}
								academicYears={academicYears}
								semesters={semesters}
								canSubmit={canUpdate}
								isPending={updateHolidayMutation.isPending}
								onChange={setHolidayForm}
								onSubmit={() => {
									if (!holidayForm.academicYearId) {
										toast.error("Vui lòng chọn năm học");
										return;
									}

									if (holidayForm.endDate < holidayForm.startDate) {
										toast.error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
										return;
									}

									updateHolidayMutation.mutate({
										holidayId: numericAcademicHolidayId,
										...holidayForm,
										semesterId: holidayForm.semesterId || undefined,
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
