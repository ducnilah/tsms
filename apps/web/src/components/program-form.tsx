import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type ProgramStatus = "active" | "inactive";

export type ProgramMajorOption = {
	id: number;
	code: string;
	name: string;
	status: ProgramStatus;
};

export type ProgramFormState = {
	majorId: number;
	code: string;
	name: string;
	academicYear: string;
	version: number;
	totalCredits: number;
	status: ProgramStatus;
};

type ProgramFormProps = {
	value: ProgramFormState;
	mode: "create" | "edit";
	majors: ProgramMajorOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: ProgramFormState) => void;
	onSubmit: () => void;
};

export const EMPTY_PROGRAM_FORM: ProgramFormState = {
	majorId: 0,
	code: "",
	name: "",
	academicYear: "",
	version: 1,
	totalCredits: 132,
	status: "active",
};

export function ProgramForm({
	value,
	mode,
	majors,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: ProgramFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="program-code">Mã chương trình</Label>
					<Input
						id="program-code"
						value={value.code}
						onChange={(event) => onChange({ ...value, code: event.target.value })}
						placeholder="Ví dụ: IT1"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="program-status">Trạng thái</Label>
					<select
						id="program-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({ ...value, status: event.target.value as ProgramStatus })
						}
						disabled={mode === "create"}
					>
						<option value="active">Đang hoạt động</option>
						<option value="inactive">Ngừng hoạt động</option>
					</select>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="program-name">Tên chương trình</Label>
				<Input
					id="program-name"
					value={value.name}
					onChange={(event) => onChange({ ...value, name: event.target.value })}
					placeholder="Ví dụ: CNTT: Khoa học Máy tính"
					required
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="program-major">Ngành</Label>
				<select
					id="program-major"
					className="h-9 border bg-background px-3 text-sm"
					value={value.majorId}
					onChange={(event) =>
						onChange({ ...value, majorId: Number(event.target.value) })
					}
					required
				>
					<option value={0}>Chọn ngành</option>
					{majors.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name} ({item.code})
						</option>
					))}
				</select>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="program-year">Khóa học</Label>
					<Input
						id="program-year"
						value={value.academicYear}
						onChange={(event) =>
							onChange({ ...value, academicYear: event.target.value })
						}
						placeholder="Ví dụ: 2024"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="program-version">Phiên bản</Label>
					<Input
						id="program-version"
						type="number"
						min={1}
						value={value.version}
						onChange={(event) =>
							onChange({ ...value, version: Number(event.target.value) })
						}
						required
					/>
				</div>
			</div>

			<div className="flex justify-end">
				<Button type="submit" disabled={!canSubmit || isPending}>
					<Save data-icon="inline-start" />
					{mode === "create" ? "Tạo chương trình" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
