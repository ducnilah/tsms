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
	EMPTY_TIME_SLOT_FORM,
	TimeSlotForm,
	type StudyShiftOption,
	type TimeSlotFormState,
} from "@/components/time-slot-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/time-slots/$timeSlotId/edit")({
	component: EditTimeSlotRoute,
});

function EditTimeSlotRoute() {
	const navigate = useNavigate();
	const { timeSlotId } = Route.useParams();
	const numericTimeSlotId = Number(timeSlotId);
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
	const canUpdate = hasPermission(permissionMap, "time-slots", "update");
	const [timeSlotForm, setTimeSlotForm] =
		useState<TimeSlotFormState>(EMPTY_TIME_SLOT_FORM);

	const timeSlotQuery = useQuery({
		...orpc["timeSlots.byId"].queryOptions({
			input: { timeSlotId: numericTimeSlotId },
		}),
		enabled: Boolean(currentUser) && numericTimeSlotId > 0,
	});

	const studyShiftsQuery = useQuery({
		...orpc["timeSlots.studyShifts"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const studyShifts = (studyShiftsQuery.data?.studyShifts ?? []) as StudyShiftOption[];

	useEffect(() => {
		const timeSlot = timeSlotQuery.data?.timeSlot;
		if (!timeSlot) return;

		setTimeSlotForm({
			name: timeSlot.name,
			studyShiftId: timeSlot.studyShiftId,
			scheduleType: timeSlot.scheduleType as TimeSlotFormState["scheduleType"],
			startTime: timeSlot.startTime,
			endTime: timeSlot.endTime,
			type: timeSlot.type as TimeSlotFormState["type"],
			status: timeSlot.status as TimeSlotFormState["status"],
		});
	}, [timeSlotQuery.data]);

	const updateTimeSlotMutation = useMutation(
		orpc["timeSlots.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật tiết học");
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
			pageTitle="Chỉnh sửa tiết học"
			pageDescription="Cập nhật khung giờ, loại lịch, loại lớp và trạng thái tiết học."
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
							Thay đổi thông tin tiết học và trạng thái sử dụng.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{timeSlotQuery.isLoading || studyShiftsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : timeSlotQuery.error || studyShiftsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin tiết học.
							</p>
						) : (
							<TimeSlotForm
								mode="edit"
								value={timeSlotForm}
								studyShifts={studyShifts}
								canSubmit={canUpdate}
								isPending={updateTimeSlotMutation.isPending}
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

									updateTimeSlotMutation.mutate({
										timeSlotId: numericTimeSlotId,
										...timeSlotForm,
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
