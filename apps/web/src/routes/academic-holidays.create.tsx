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

export const Route = createFileRoute("/academic-holidays/create")({
	component: CreateAcademicHolidayRoute,
});

function CreateAcademicHolidayRoute() {
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
	const canCreate = hasPermission(permissionMap, "academic-holidays", "create");
	const [holidayForm, setHolidayForm] =
		useState<AcademicHolidayFormState>(EMPTY_ACADEMIC_HOLIDAY_FORM);

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

	const createHolidayMutation = useMutation(
		orpc["academicHolidays.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo ngày nghỉ/lễ");
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
			pageTitle="Tạo ngày nghỉ/lễ"
			pageDescription="Tạo mốc nghỉ lễ, sự kiện hoặc tuần thi theo phạm vi năm học/học kỳ."
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
							Nếu không chọn học kỳ, mốc này được hiểu là áp dụng cho toàn năm học.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<AcademicHolidayForm
							mode="create"
							value={holidayForm}
							academicYears={academicYears}
							semesters={semesters}
							canSubmit={canCreate}
							isPending={createHolidayMutation.isPending}
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

								createHolidayMutation.mutate({
									...holidayForm,
									semesterId: holidayForm.semesterId || undefined,
								});
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
