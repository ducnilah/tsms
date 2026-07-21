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
	EMPTY_TIME_SLOT_FORM,
	TimeSlotForm,
	type StudyShiftOption,
	type TimeSlotFormState,
} from "@/components/time-slot-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/time-slots/create")({
	component: CreateTimeSlotRoute,
});

function CreateTimeSlotRoute() {
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
	const canCreate = hasPermission(permissionMap, "time-slots", "create");
	const [timeSlotForm, setTimeSlotForm] =
		useState<TimeSlotFormState>(EMPTY_TIME_SLOT_FORM);

	const studyShiftsQuery = useQuery({
		...orpc["timeSlots.studyShifts"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const studyShifts = (studyShiftsQuery.data?.studyShifts ?? []) as StudyShiftOption[];

	const createTimeSlotMutation = useMutation(
		orpc["timeSlots.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo tiết học");
				await queryClient.invalidateQueries();
				navigate({ to: "/time-slots" });
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
			pageTitle="Tạo tiết học"
			pageDescription="Tạo khung giờ tiết học theo buổi, loại lịch và loại lớp."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<Button type="button" variant="outline" onClick={() => navigate({ to: "/time-slots" })}>
					<ArrowLeft data-icon="inline-start" />
					Quay lại danh sách
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin tiết học</CardTitle>
						<CardDescription>
							Backend sẽ tự sinh mã tiết học từ tên tiết, loại lịch, loại lớp và khung giờ.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<TimeSlotForm
							mode="create"
							value={timeSlotForm}
							studyShifts={studyShifts}
							canSubmit={canCreate}
							isPending={createTimeSlotMutation.isPending}
							onChange={setTimeSlotForm}
							onSubmit={() => {
								if (!timeSlotForm.studyShiftId) {
									toast.error("Vui lòng chọn buổi học");
									return;
								}

								if (timeSlotForm.endTime <= timeSlotForm.startTime) {
									toast.error("Giờ kết thúc phải sau giờ bắt đầu");
									return;
								}

								createTimeSlotMutation.mutate({
									name: timeSlotForm.name,
									studyShiftId: timeSlotForm.studyShiftId,
									scheduleType: timeSlotForm.scheduleType,
									startTime: timeSlotForm.startTime,
									endTime: timeSlotForm.endTime,
									type: timeSlotForm.type,
								});
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
