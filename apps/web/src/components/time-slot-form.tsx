import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type TimeSlotStatus = "active" | "inactive";
export type TimeSlotScheduleType = "lecture" | "practice" | "integrated";
export type TimeSlotClassType = 1 | 2;

export type StudyShiftOption = {
	id: number;
	code: string;
	name: string;
	startTime: string;
	endTime: string;
	status: TimeSlotStatus;
};

export type TimeSlotFormState = {
	name: string;
	studyShiftId: number;
	scheduleType: TimeSlotScheduleType;
	startTime: string;
	endTime: string;
	type: TimeSlotClassType;
	status: TimeSlotStatus;
};

type TimeSlotFormProps = {
	value: TimeSlotFormState;
	mode: "create" | "edit";
	studyShifts: StudyShiftOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: TimeSlotFormState) => void;
	onSubmit: () => void;
};

export const TIME_SLOT_SCHEDULE_TYPE_OPTIONS = [
	{ label: "Lý thuyết", value: "lecture" },
	{ label: "Thực hành", value: "practice" },
	{ label: "Tích hợp", value: "integrated" },
] as const;

export const TIME_SLOT_CLASS_TYPE_OPTIONS = [
	{ label: "Học lần đầu", value: 1 },
	{ label: "Học lại", value: 2 },
] as const;

export const EMPTY_TIME_SLOT_FORM: TimeSlotFormState = {
	name: "",
	studyShiftId: 0,
	scheduleType: "lecture",
	startTime: "",
	endTime: "",
	type: 1,
	status: "active",
};

export function TimeSlotForm({
	value,
	mode,
	studyShifts,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: TimeSlotFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="time-slot-name">Tên tiết học</Label>
					<Input
						id="time-slot-name"
						value={value.name}
						onChange={(event) => onChange({ ...value, name: event.target.value })}
						placeholder="Ví dụ: Tiết 1"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="time-slot-shift">Buổi học</Label>
					<select
						id="time-slot-shift"
						className="h-9 border bg-background px-3 text-sm"
						value={value.studyShiftId}
						onChange={(event) =>
							onChange({ ...value, studyShiftId: Number(event.target.value) })
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

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="time-slot-schedule-type">Áp dụng cho lịch</Label>
					<select
						id="time-slot-schedule-type"
						className="h-9 border bg-background px-3 text-sm"
						value={value.scheduleType}
						onChange={(event) =>
							onChange({
								...value,
								scheduleType: event.target.value as TimeSlotScheduleType,
							})
						}
					>
						{TIME_SLOT_SCHEDULE_TYPE_OPTIONS.map((item) => (
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
						value={value.type}
						onChange={(event) =>
							onChange({
								...value,
								type: Number(event.target.value) as TimeSlotClassType,
							})
						}
					>
						{TIME_SLOT_CLASS_TYPE_OPTIONS.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="time-slot-start">Giờ bắt đầu</Label>
					<Input
						id="time-slot-start"
						type="time"
						value={value.startTime}
						onChange={(event) =>
							onChange({ ...value, startTime: event.target.value })
						}
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="time-slot-end">Giờ kết thúc</Label>
					<Input
						id="time-slot-end"
						type="time"
						value={value.endTime}
						onChange={(event) => onChange({ ...value, endTime: event.target.value })}
						required
					/>
				</div>
			</div>

			{mode === "edit" ? (
				<div className="flex flex-col gap-2 md:max-w-xs">
					<Label htmlFor="time-slot-status">Trạng thái</Label>
					<select
						id="time-slot-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({ ...value, status: event.target.value as TimeSlotStatus })
						}
					>
						<option value="active">Đang hoạt động</option>
						<option value="inactive">Ngừng hoạt động</option>
					</select>
				</div>
			) : null}

			<div className="flex justify-end">
				<Button type="submit" disabled={!canSubmit || isPending}>
					<Save data-icon="inline-start" />
					{mode === "create" ? "Tạo tiết học" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
