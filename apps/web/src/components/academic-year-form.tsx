import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type AcademicYearStatus = "active" | "draft" | "locked" | "archived";

export type AcademicYearFormState = {
	code: string;
	name: string;
	startDate: string;
	endDate: string;
	status: AcademicYearStatus;
};

type AcademicYearFormProps = {
	value: AcademicYearFormState;
	mode: "create" | "edit";
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: AcademicYearFormState) => void;
	onSubmit: () => void;
};

export const ACADEMIC_YEAR_STATUS_OPTIONS = [
	{ label: "Đang hoạt động", value: "active" },
	{ label: "Nháp", value: "draft" },
	{ label: "Đã khóa", value: "locked" },
	{ label: "Lưu trữ", value: "archived" },
] as const;

export const EMPTY_ACADEMIC_YEAR_FORM: AcademicYearFormState = {
	code: "",
	name: "",
	startDate: "",
	endDate: "",
	status: "active",
};

export function AcademicYearForm({
	value,
	mode,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: AcademicYearFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-year-code">Mã năm học</Label>
					<Input
						id="academic-year-code"
						value={value.code}
						onChange={(event) => onChange({ ...value, code: event.target.value })}
						placeholder="Ví dụ: 2025-2026"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-year-status">Trạng thái</Label>
					<select
						id="academic-year-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({
								...value,
								status: event.target.value as AcademicYearStatus,
							})
						}
					>
						{ACADEMIC_YEAR_STATUS_OPTIONS.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="academic-year-name">Tên năm học</Label>
				<Input
					id="academic-year-name"
					value={value.name}
					onChange={(event) => onChange({ ...value, name: event.target.value })}
					placeholder="Ví dụ: Năm học 2025-2026"
					required
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-year-start">Ngày bắt đầu</Label>
					<Input
						id="academic-year-start"
						type="date"
						value={value.startDate}
						onChange={(event) =>
							onChange({ ...value, startDate: event.target.value })
						}
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="academic-year-end">Ngày kết thúc</Label>
					<Input
						id="academic-year-end"
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
					{mode === "create" ? "Tạo năm học" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
