import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type DepartmentStatus = "active" | "inactive";

export type FacultyOption = {
	id: number;
	code: string;
	name: string;
	status: "active" | "inactive";
};

export type DepartmentFormState = {
	facultyId: number;
	code: string;
	name: string;
	description: string;
	status: DepartmentStatus;
};

type DepartmentFormProps = {
	value: DepartmentFormState;
	mode: "create" | "edit";
	faculties: FacultyOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: DepartmentFormState) => void;
	onSubmit: () => void;
};

export const EMPTY_DEPARTMENT_FORM: DepartmentFormState = {
	facultyId: 0,
	code: "",
	name: "",
	description: "",
	status: "active",
};

export function DepartmentForm({
	value,
	mode,
	faculties,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: DepartmentFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label htmlFor="department-faculty">Khoa</Label>
				<select
					id="department-faculty"
					className="h-9 border bg-background px-3 text-sm"
					value={value.facultyId}
					onChange={(event) =>
						onChange({ ...value, facultyId: Number(event.target.value) })
					}
					required
				>
					<option value={0}>Chọn khoa</option>
					{faculties.map((item) => (
						<option key={item.id} value={item.id}>
							{item.name}
						</option>
					))}
				</select>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="department-code">Mã bộ môn</Label>
					<Input
						id="department-code"
						value={value.code}
						onChange={(event) => onChange({ ...value, code: event.target.value })}
						placeholder="Ví dụ: IT"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="department-name">Tên bộ môn</Label>
					<Input
						id="department-name"
						value={value.name}
						onChange={(event) => onChange({ ...value, name: event.target.value })}
						placeholder="Ví dụ: Công nghệ phần mềm"
						required
					/>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="department-description">Mô tả</Label>
				<textarea
					id="department-description"
					className="min-h-32 border bg-background px-3 py-2 text-sm"
					value={value.description}
					onChange={(event) =>
						onChange({ ...value, description: event.target.value })
					}
					placeholder="Ghi thông tin mô tả về bộ môn"
				/>
			</div>

			{mode === "edit" ? (
				<div className="flex flex-col gap-2 md:max-w-xs">
					<Label htmlFor="department-status">Trạng thái</Label>
					<select
						id="department-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({
								...value,
								status: event.target.value as DepartmentStatus,
							})
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
					{mode === "create" ? "Tạo bộ môn" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
