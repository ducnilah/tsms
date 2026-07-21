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
	AcademicWeekForm,
	EMPTY_ACADEMIC_WEEK_FORM,
	type AcademicWeekFormState,
} from "@/components/academic-week-form";
import { AppShell } from "@/components/app-shell";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/academic-weeks/$academicWeekId/edit")({
	component: EditAcademicWeekRoute,
});

function EditAcademicWeekRoute() {
	const navigate = useNavigate();
	const { academicWeekId } = Route.useParams();
	const numericAcademicWeekId = Number(academicWeekId);
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
	const canUpdate = hasPermission(permissionMap, "semester-weeks", "update");
	const [weekForm, setWeekForm] =
		useState<AcademicWeekFormState>(EMPTY_ACADEMIC_WEEK_FORM);

	const weekQuery = useQuery({
		...orpc["academicWeeks.byId"].queryOptions({
			input: { weekId: numericAcademicWeekId },
		}),
		enabled: Boolean(currentUser) && numericAcademicWeekId > 0,
	});

	useEffect(() => {
		const week = weekQuery.data?.week;
		if (!week) return;

		setWeekForm({
			isTeachingWeek: week.isTeachingWeek,
			note: week.note,
		});
	}, [weekQuery.data]);

	const updateWeekMutation = useMutation(
		orpc["academicWeeks.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật tuần học");
				await queryClient.invalidateQueries();
				navigate({ to: "/academic-weeks" });
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

	const week = weekQuery.data?.week;

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Chỉnh sửa tuần học"
			pageDescription="Cập nhật trạng thái học/nghỉ và ghi chú của tuần học."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<Button type="button" variant="outline" onClick={() => navigate({ to: "/academic-weeks" })}>
					<ArrowLeft data-icon="inline-start" />
					Quay lại danh sách
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin tuần học</CardTitle>
						<CardDescription>
							Tuần học được sinh từ học kỳ; màn này chỉ chỉnh trạng thái và ghi chú.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{weekQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : weekQuery.error || !week ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin tuần học.
							</p>
						) : (
							<AcademicWeekForm
								value={weekForm}
								weekInfo={{
									weekNumber: week.weekNumber,
									startDate: week.startDate,
									endDate: week.endDate,
									semesterName: week.semesterName,
									semesterCode: week.semesterCode,
								}}
								canSubmit={canUpdate}
								isPending={updateWeekMutation.isPending}
								onChange={setWeekForm}
								onSubmit={() =>
									updateWeekMutation.mutate({
										weekId: numericAcademicWeekId,
										isTeachingWeek: weekForm.isTeachingWeek,
										note: weekForm.note,
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
