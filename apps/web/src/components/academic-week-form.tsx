import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type AcademicWeekFormState = {
	isTeachingWeek: boolean;
	note: string;
};

type AcademicWeekFormProps = {
	value: AcademicWeekFormState;
	weekInfo: {
		weekNumber: number;
		startDate: string;
		endDate: string;
		semesterName: string;
		semesterCode: string;
	};
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: AcademicWeekFormState) => void;
	onSubmit: () => void;
};

export const EMPTY_ACADEMIC_WEEK_FORM: AcademicWeekFormState = {
	isTeachingWeek: true,
	note: "",
};

export function AcademicWeekForm({
	value,
	weekInfo,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: AcademicWeekFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label>Tuần học</Label>
					<div className="border bg-muted/40 px-3 py-2 text-sm">
						Tuần {weekInfo.weekNumber}
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<Label>Học kỳ</Label>
					<div className="border bg-muted/40 px-3 py-2 text-sm">
						{weekInfo.semesterName} ({weekInfo.semesterCode})
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label>Thời gian</Label>
				<div className="border bg-muted/40 px-3 py-2 text-sm">
					{weekInfo.startDate} → {weekInfo.endDate}
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="academic-week-status">Trạng thái tuần</Label>
				<select
					id="academic-week-status"
					className="h-9 border bg-background px-3 text-sm"
					value={value.isTeachingWeek ? "teaching" : "off"}
					onChange={(event) =>
						onChange({
							...value,
							isTeachingWeek: event.target.value === "teaching",
						})
					}
				>
					<option value="teaching">Tuần học</option>
					<option value="off">Nghỉ/không học</option>
				</select>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="academic-week-note">Ghi chú</Label>
				<Input
					id="academic-week-note"
					value={value.note}
					onChange={(event) => onChange({ ...value, note: event.target.value })}
					placeholder="Ví dụ: Tuần thi giữa kỳ"
				/>
			</div>

			<div className="flex justify-end">
				<Button type="submit" disabled={!canSubmit || isPending}>
					<Save data-icon="inline-start" />
					Lưu thay đổi
				</Button>
			</div>
		</form>
	);
}
