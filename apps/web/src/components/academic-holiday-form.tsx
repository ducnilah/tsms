import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

import { type AcademicYearOption } from "@/components/semester-form";

export type HolidayType = "holiday" | "event" | "exam" | "makeup" | "break" | "other";
export type HolidayStatus = "active" | "inactive";

export type SemesterOption = {
	id: number;
	academicYearId: number;
	code: string;
	name: string;
};

export type AcademicHolidayFormState = {
	academicYearId: number;
	semesterId: number;
	name: string;
	type: HolidayType;
	startDate: string;
	endDate: string;
	status: HolidayStatus;
};

type AcademicHolidayFormProps = {
	value: AcademicHolidayFormState;
	mode: "create" | "edit";
	academicYears: AcademicYearOption[];
	semesters: SemesterOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: AcademicHolidayFormState) => void;
	onSubmit: () => void;
};

export const HOLIDAY_TYPE_OPTIONS = [
	{ label: "Nghỉ lễ", value: "holiday" },
	{ label: "Sự kiện", value: "event" },
	{ label: "Thi", value: "exam" },
	{ label: "Học bù", value: "makeup" },
	{ label: "Nghỉ giữa kỳ", value: "break" },
	{ label: "Khác", value: "other" },
] as const;

export const HOLIDAY_STATUS_OPTIONS = [
	{ label: "Đang áp dụng", value: "active" },
	{ label: "Ngừng áp dụng", value: "inactive" },
] as const;

export const EMPTY_ACADEMIC_HOLIDAY_FORM: AcademicHolidayFormState = {
	academicYearId: 0,
	semesterId: 0,
	name: "",
	type: "holiday",
	startDate: "",
	endDate: "",
	status: "active",
};

export function AcademicHolidayForm({
	value,
	mode,
	academicYears,
	semesters,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: AcademicHolidayFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};
	const filteredSemesters = value.academicYearId
		? semesters.filter((item) => item.academicYearId === value.academicYearId)
		: semesters;

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label htmlFor="academic-holiday-name">Tên ngày nghỉ/lễ</Label>
				<Input
					id="academic-holiday-name"
					value={value.name}
					onChange={(event) => onChange({ ...value, name: event.target.value })}
					placeholder="Ví dụ: Nghỉ lễ Quốc khánh"
					required
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-holiday-year">Năm học</Label>
					<select
						id="academic-holiday-year"
						className="h-9 border bg-background px-3 text-sm"
						value={value.academicYearId}
						onChange={(event) =>
							onChange({
								...value,
								academicYearId: Number(event.target.value),
								semesterId: 0,
							})
						}
						required
					>
						<option value={0}>Chọn năm học</option>
						{academicYears.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name} ({item.code})
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-holiday-semester">Học kỳ</Label>
					<select
						id="academic-holiday-semester"
						className="h-9 border bg-background px-3 text-sm"
						value={value.semesterId}
						onChange={(event) =>
							onChange({ ...value, semesterId: Number(event.target.value) })
						}
					>
						<option value={0}>Toàn năm học</option>
						{filteredSemesters.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name} ({item.code})
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-holiday-type">Loại</Label>
					<select
						id="academic-holiday-type"
						className="h-9 border bg-background px-3 text-sm"
						value={value.type}
						onChange={(event) =>
							onChange({ ...value, type: event.target.value as HolidayType })
						}
					>
						{HOLIDAY_TYPE_OPTIONS.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-holiday-status">Trạng thái</Label>
					<select
						id="academic-holiday-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({ ...value, status: event.target.value as HolidayStatus })
						}
					>
						{HOLIDAY_STATUS_OPTIONS.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-holiday-start">Ngày bắt đầu</Label>
					<Input
						id="academic-holiday-start"
						type="date"
						value={value.startDate}
						onChange={(event) =>
							onChange({ ...value, startDate: event.target.value })
						}
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-holiday-end">Ngày kết thúc</Label>
					<Input
						id="academic-holiday-end"
						type="date"
						value={value.endDate}
						onChange={(event) =>
							onChange({ ...value, endDate: event.target.value })
						}
						required
					/>
				</div>
			</div>

			<div className="flex justify-end">
				<Button type="submit" disabled={!canSubmit || isPending}>
					<Save data-icon="inline-start" />
					{mode === "create" ? "Tạo ngày nghỉ/lễ" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
