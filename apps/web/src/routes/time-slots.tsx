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
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Skeleton } from "@tsms/ui/components/skeleton";
import { Clock, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ListControls } from "@/components/list-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/time-slots")({
	component: TimeSlotsRoute,
});

type TimeSlotStatus = "active" | "inactive";
type ScheduleType = "lecture" | "practice" | "integrated";
type ClassType = 1 | 2;

type TimeSlotItem = {
	id: number;
	name: string;
	studyShiftId: number;
	studyShiftName: string;
	scheduleType: ScheduleType;
	startTime: string;
	endTime: string;
	type: ClassType;
	status: TimeSlotStatus;
};

type StudyShiftOption = {
	id: number;
	name: string;
	startTime: string;
	endTime: string;
	status: TimeSlotStatus;
};

type TimeSlotFormState = {
	timeSlotId: number;
	name: string;
	studyShiftId: number;
	scheduleType: ScheduleType;
	startTime: string;
	endTime: string;
	type: ClassType;
	status: TimeSlotStatus;
};

const EMPTY_TIME_SLOT_FORM: TimeSlotFormState = {
	timeSlotId: 0,
	name: "Tiết 1",
	studyShiftId: 0,
	scheduleType: "lecture",
	startTime: "06:45",
	endTime: "07:30",
	type: 1,
	status: "active",
};

const SCHEDULE_TYPE_OPTIONS = [
	{ label: "Lý thuyết", value: "lecture" },
	{ label: "Thực hành", value: "practice" },
	{ label: "Tích hợp", value: "integrated" },
] as const;

const CLASS_TYPE_OPTIONS = [
	{ label: "Học lần đầu", value: 1 },
	{ label: "Học lại", value: 2 },
] as const;

function getScheduleTypeLabel(value: ScheduleType) {
	return SCHEDULE_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function getClassTypeLabel(value: ClassType) {
	return CLASS_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? `Loại ${value}`;
}

function TimeSlotsRoute() {
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
	const canRead = hasPermission(permissionMap, "time-slots", "read");
	const canCreate = hasPermission(permissionMap, "time-slots", "create");
	const canUpdate = hasPermission(permissionMap, "time-slots", "update");
	const canDelete = hasPermission(permissionMap, "time-slots", "delete");

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [studyShiftFilterId, setStudyShiftFilterId] = useState(0);
	const [scheduleTypeFilter, setScheduleTypeFilter] = useState("");
	const [classTypeFilter, setClassTypeFilter] = useState("");
	const limit = 6;

	const timeSlotsQuery = useQuery({
		...orpc["timeSlots.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as TimeSlotStatus) : undefined,
				studyShiftId: studyShiftFilterId || undefined,
				scheduleType: scheduleTypeFilter
					? (scheduleTypeFilter as ScheduleType)
					: undefined,
				type: classTypeFilter ? (Number(classTypeFilter) as ClassType) : undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const studyShiftsQuery = useQuery({
		...orpc["timeSlots.studyShifts"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const [selectedTimeSlotId, setSelectedTimeSlotId] = useState(0);
	const [isCreatingTimeSlot, setIsCreatingTimeSlot] = useState(false);
	const [timeSlotForm, setTimeSlotForm] =
		useState<TimeSlotFormState>(EMPTY_TIME_SLOT_FORM);

	const timeSlots = (timeSlotsQuery.data?.timeSlots ?? []) as TimeSlotItem[];
	const studyShifts = (studyShiftsQuery.data?.studyShifts ?? []) as StudyShiftOption[];
	const pagination = timeSlotsQuery.data?.pagination;
	const selectedTimeSlot = useMemo(
		() => timeSlots.find((item) => item.id === selectedTimeSlotId) ?? null,
		[timeSlots, selectedTimeSlotId],
	);

	useEffect(() => {
		if (!isCreatingTimeSlot && selectedTimeSlotId === 0 && timeSlots.length > 0) {
			setSelectedTimeSlotId(timeSlots[0].id);
		}
	}, [isCreatingTimeSlot, selectedTimeSlotId, timeSlots]);

	useEffect(() => {
		if (timeSlots.length === 0) {
			setSelectedTimeSlotId(0);
			if (!isCreatingTimeSlot) {
				setTimeSlotForm(EMPTY_TIME_SLOT_FORM);
			}
			return;
		}

		if (
			!isCreatingTimeSlot &&
			!timeSlots.some((item) => item.id === selectedTimeSlotId)
		) {
			setSelectedTimeSlotId(timeSlots[0].id);
		}
	}, [isCreatingTimeSlot, selectedTimeSlotId, timeSlots]);

	useEffect(() => {
		if (isCreatingTimeSlot || !selectedTimeSlot) {
			return;
		}

		setTimeSlotForm({
			timeSlotId: selectedTimeSlot.id,
			name: selectedTimeSlot.name,
			studyShiftId: selectedTimeSlot.studyShiftId,
			scheduleType: selectedTimeSlot.scheduleType,
			startTime: selectedTimeSlot.startTime,
			endTime: selectedTimeSlot.endTime,
			type: selectedTimeSlot.type,
			status: selectedTimeSlot.status,
		});
	}, [isCreatingTimeSlot, selectedTimeSlot]);

	const invalidateTimeSlots = async () => {
		await queryClient.invalidateQueries();
	};

	const createTimeSlotMutation = useMutation(
		orpc["timeSlots.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo tiết học");
				setIsCreatingTimeSlot(false);
				setSelectedTimeSlotId(data.timeSlot.id);
				await invalidateTimeSlots();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateTimeSlotMutation = useMutation(
		orpc["timeSlots.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật tiết học");
				setIsCreatingTimeSlot(false);
				setSelectedTimeSlotId(data.timeSlot.id);
				await invalidateTimeSlots();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteTimeSlotMutation = useMutation(
		orpc["timeSlots.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa tiết học");
				setIsCreatingTimeSlot(false);
				setTimeSlotForm(EMPTY_TIME_SLOT_FORM);
				await invalidateTimeSlots();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSaveTimeSlot = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!timeSlotForm.studyShiftId) {
			toast.error("Vui lòng chọn buổi học");
			return;
		}

		if (timeSlotForm.endTime <= timeSlotForm.startTime) {
			toast.error("Giờ kết thúc phải sau giờ bắt đầu");
			return;
		}

		if (timeSlotForm.timeSlotId > 0) {
			updateTimeSlotMutation.mutate(timeSlotForm);
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
	};

	const beginCreateTimeSlot = () => {
		setIsCreatingTimeSlot(true);
		setSelectedTimeSlotId(0);
		setTimeSlotForm({
			...EMPTY_TIME_SLOT_FORM,
			studyShiftId: studyShifts[0]?.id ?? 0,
		});
	};

	const handleDeleteTimeSlot = () => {
		if (!selectedTimeSlot) return;

		if (!confirm(`Xóa ${selectedTimeSlot.name} (${selectedTimeSlot.startTime}-${selectedTimeSlot.endTime})?`)) {
			return;
		}

		deleteTimeSlotMutation.mutate({ timeSlotId: selectedTimeSlot.id });
	};

	if (meQuery.isLoading) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return null;
	}

	if (!canRead) {
		return (
			<AppShell
				currentUser={currentUser}
				permissionMap={permissionMap}
				pageTitle="Quản lý tiết học"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý tiết học."
			>
				<Card>
					<CardContent className="p-6 text-muted-foreground text-sm">
						Vui lòng liên hệ quản trị viên để được cấp quyền phù hợp.
					</CardContent>
				</Card>
			</AppShell>
		);
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Quản lý tiết học"
			pageDescription="Quản lý khung giờ áp dụng cho lý thuyết, thực hành, tích hợp và loại lớp."
		>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
				<Card>
					<CardHeader>
						<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
							<div>
								<CardTitle>Danh sách tiết học</CardTitle>
								<CardDescription>
									Tìm theo tên tiết, mã kỹ thuật hoặc buổi học.
								</CardDescription>
							</div>
							{canCreate ? (
								<Button type="button" onClick={beginCreateTimeSlot}>
									<Plus data-icon="inline-start" />
									Thêm tiết học
								</Button>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<ListControls
							search={search}
							onSearchChange={(value) => {
								setSearch(value);
								setPage(1);
							}}
							status={statusFilter}
							onStatusChange={(value) => {
								setStatusFilter(value);
								setPage(1);
							}}
							statusOptions={[
								{ label: "Đang dùng", value: "active" },
								{ label: "Ngừng dùng", value: "inactive" },
							]}
							pagination={pagination}
							onPageChange={setPage}
						/>

						<div className="grid gap-3 md:grid-cols-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="filter-study-shift">Buổi học</Label>
								<select
									id="filter-study-shift"
									className="h-9 border bg-background px-3 text-sm"
									value={studyShiftFilterId}
									onChange={(event) => {
										setStudyShiftFilterId(Number(event.target.value));
										setPage(1);
									}}
								>
									<option value={0}>Tất cả</option>
									{studyShifts.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="filter-schedule-type">Áp dụng cho lịch</Label>
								<select
									id="filter-schedule-type"
									className="h-9 border bg-background px-3 text-sm"
									value={scheduleTypeFilter}
									onChange={(event) => {
										setScheduleTypeFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả</option>
									{SCHEDULE_TYPE_OPTIONS.map((item) => (
										<option key={item.value} value={item.value}>
											{item.label}
										</option>
									))}
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="filter-class-type">Loại lớp</Label>
								<select
									id="filter-class-type"
									className="h-9 border bg-background px-3 text-sm"
									value={classTypeFilter}
									onChange={(event) => {
										setClassTypeFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả</option>
									{CLASS_TYPE_OPTIONS.map((item) => (
										<option key={item.value} value={item.value}>
											{item.label}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="overflow-hidden border">
							<table className="w-full text-sm">
								<thead className="bg-muted/60 text-left">
									<tr>
										<th className="px-3 py-2 font-medium">Tên tiết học</th>
										<th className="px-3 py-2 font-medium">Áp dụng cho lịch</th>
										<th className="px-3 py-2 font-medium">Buổi học</th>
										<th className="px-3 py-2 font-medium">Giờ bắt đầu</th>
										<th className="px-3 py-2 font-medium">Giờ kết thúc</th>
										<th className="px-3 py-2 font-medium">Áp dụng cho loại lớp</th>
										<th className="px-3 py-2 font-medium">Trạng thái</th>
									</tr>
								</thead>
								<tbody>
									{timeSlotsQuery.isLoading ? (
										Array.from({ length: 6 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={7} className="px-3 py-2">
													<Skeleton className="h-5 w-full" />
												</td>
											</tr>
										))
									) : timeSlots.length > 0 ? (
										timeSlots.map((item) => (
											<tr
												key={item.id}
												className={`cursor-pointer border-t transition-colors hover:bg-muted/40 ${
													selectedTimeSlotId === item.id ? "bg-muted/60" : ""
												}`}
												onClick={() => {
													setIsCreatingTimeSlot(false);
													setSelectedTimeSlotId(item.id);
												}}
											>
												<td className="px-3 py-2 font-medium">{item.name}</td>
												<td className="px-3 py-2">{getScheduleTypeLabel(item.scheduleType)}</td>
												<td className="px-3 py-2">{item.studyShiftName}</td>
												<td className="px-3 py-2">{item.startTime}</td>
												<td className="px-3 py-2">{item.endTime}</td>
												<td className="px-3 py-2">{getClassTypeLabel(item.type)}</td>
												<td className="px-3 py-2">
													{item.status === "active" ? "Đang dùng" : "Ngừng dùng"}
												</td>
											</tr>
										))
									) : (
										<tr>
											<td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
												Chưa có tiết học phù hợp.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-start justify-between gap-3">
							<div>
								<CardTitle>{isCreatingTimeSlot ? "Thêm tiết học" : "Chi tiết tiết học"}</CardTitle>
								<CardDescription>
									{isCreatingTimeSlot
										? "Tạo khung giờ mới cho lịch học."
										: selectedTimeSlot
											? "Cập nhật thông tin tiết học đang chọn."
											: "Chọn một tiết học để xem chi tiết."}
								</CardDescription>
							</div>
							<Clock className="text-muted-foreground" />
						</div>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSaveTimeSlot} className="flex flex-col gap-4">
							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="time-slot-name">Tên tiết học</Label>
									<Input
										id="time-slot-name"
										value={timeSlotForm.name}
										onChange={(event) =>
											setTimeSlotForm((current) => ({
												...current,
												name: event.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="time-slot-shift">Buổi học</Label>
									<select
										id="time-slot-shift"
										className="h-9 border bg-background px-3 text-sm"
										value={timeSlotForm.studyShiftId}
										onChange={(event) =>
											setTimeSlotForm((current) => ({
												...current,
												studyShiftId: Number(event.target.value),
											}))
										}
										required
									>
										<option value={0}>Chọn buổi học</option>
										{studyShifts.map((item) => (
											<option key={item.id} value={item.id}>
												{item.name}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="time-slot-schedule-type">Áp dụng cho lịch</Label>
									<select
										id="time-slot-schedule-type"
										className="h-9 border bg-background px-3 text-sm"
										value={timeSlotForm.scheduleType}
										onChange={(event) =>
											setTimeSlotForm((current) => ({
												...current,
												scheduleType: event.target.value as ScheduleType,
											}))
										}
									>
										{SCHEDULE_TYPE_OPTIONS.map((item) => (
											<option key={item.value} value={item.value}>
												{item.label}
											</option>
										))}
									</select>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="time-slot-class-type">Áp dụng cho loại lớp</Label>
									<select
										id="time-slot-class-type"
										className="h-9 border bg-background px-3 text-sm"
										value={timeSlotForm.type}
										onChange={(event) =>
											setTimeSlotForm((current) => ({
												...current,
												type: Number(event.target.value) as ClassType,
											}))
										}
									>
										{CLASS_TYPE_OPTIONS.map((item) => (
											<option key={item.value} value={item.value}>
												{item.label}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="time-slot-start">Giờ bắt đầu</Label>
									<Input
										id="time-slot-start"
										type="time"
										value={timeSlotForm.startTime}
										onChange={(event) =>
											setTimeSlotForm((current) => ({
												...current,
												startTime: event.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="time-slot-end">Giờ kết thúc</Label>
									<Input
										id="time-slot-end"
										type="time"
										value={timeSlotForm.endTime}
										onChange={(event) =>
											setTimeSlotForm((current) => ({
												...current,
												endTime: event.target.value,
											}))
										}
										required
									/>
								</div>
							</div>

							{timeSlotForm.timeSlotId > 0 ? (
								<div className="flex flex-col gap-2">
									<Label htmlFor="time-slot-status">Trạng thái</Label>
									<select
										id="time-slot-status"
										className="h-9 border bg-background px-3 text-sm"
										value={timeSlotForm.status}
										onChange={(event) =>
											setTimeSlotForm((current) => ({
												...current,
												status: event.target.value as TimeSlotStatus,
											}))
										}
									>
										<option value="active">Đang dùng</option>
										<option value="inactive">Ngừng dùng</option>
									</select>
								</div>
							) : null}

							<div className="flex flex-wrap gap-2">
								<Button
									type="submit"
									disabled={
										(!isCreatingTimeSlot && !canUpdate) ||
										(isCreatingTimeSlot && !canCreate) ||
										createTimeSlotMutation.isPending ||
										updateTimeSlotMutation.isPending
									}
								>
									{timeSlotForm.timeSlotId > 0 ? (
										<Pencil data-icon="inline-start" />
									) : (
										<Save data-icon="inline-start" />
									)}
									{timeSlotForm.timeSlotId > 0 ? "Cập nhật" : "Tạo mới"}
								</Button>
								{selectedTimeSlot && !isCreatingTimeSlot && canDelete ? (
									<Button
										type="button"
										variant="destructive"
										onClick={handleDeleteTimeSlot}
										disabled={deleteTimeSlotMutation.isPending}
									>
										<Trash2 data-icon="inline-start" />
										Xóa
									</Button>
								) : null}
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
