import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type SemesterStatus = "draft" | "open" | "locked" | "archived";
export type SemesterType = "regular" | "summer";

export type AcademicYearOption = {
	id: number;
	code: string;
	name: string;
	status?: string;
};

export type SemesterFormState = {
	academicYearId: number;
	code: string;
	name: string;
	type: SemesterType;
	startDate: string;
	endDate: string;
	status: SemesterStatus;
};

type SemesterFormProps = {
	value: SemesterFormState;
	mode: "create" | "edit";
	academicYears: AcademicYearOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: SemesterFormState) => void;
	onSubmit: () => void;
};

export const SEMESTER_STATUS_OPTIONS = [
	{ label: "Nháp", value: "draft" },
	{ label: "Đang mở", value: "open" },
	{ label: "Đã khóa", value: "locked" },
	{ label: "Lưu trữ", value: "archived" },
] as const;

export const SEMESTER_TYPE_OPTIONS = [
	{ label: "Chính quy", value: "regular" },
	{ label: "Học kỳ hè", value: "summer" },
] as const;

export const EMPTY_SEMESTER_FORM: SemesterFormState = {
	academicYearId: 0,
	code: "",
	name: "",
	type: "regular",
	startDate: "",
	endDate: "",
	status: "draft",
};

export function SemesterForm({
	value,
	mode,
	academicYears,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: SemesterFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="semester-code">Mã học kỳ</Label>
					<Input
						id="semester-code"
						value={value.code}
						onChange={(event) => onChange({ ...value, code: event.target.value })}
						placeholder="Ví dụ: 2025-2026-1"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="semester-status">Trạng thái</Label>
					<select
						id="semester-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({
								...value,
								status: event.target.value as SemesterStatus,
							})
						}
					>
						{SEMESTER_STATUS_OPTIONS.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="semester-name">Tên học kỳ</Label>
				<Input
					id="semester-name"
					value={value.name}
					onChange={(event) => onChange({ ...value, name: event.target.value })}
					placeholder="Ví dụ: Học kỳ 1 năm học 2025-2026"
					required
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="semester-academic-year">Năm học</Label>
					<select
						id="semester-academic-year"
						className="h-9 border bg-background px-3 text-sm"
						value={value.academicYearId}
						onChange={(event) =>
							onChange({ ...value, academicYearId: Number(event.target.value) })
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
					<Label htmlFor="semester-type">Loại học kỳ</Label>
					<select
						id="semester-type"
						className="h-9 border bg-background px-3 text-sm"
						value={value.type}
						onChange={(event) =>
							onChange({ ...value, type: event.target.value as SemesterType })
						}
					>
						{SEMESTER_TYPE_OPTIONS.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="semester-start">Ngày bắt đầu</Label>
					<Input
						id="semester-start"
						type="date"
						value={value.startDate}
						onChange={(event) =>
							onChange({ ...value, startDate: event.target.value })
						}
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="semester-end">Ngày kết thúc</Label>
					<Input
						id="semester-end"
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
					{mode === "create" ? "Tạo học kỳ" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
