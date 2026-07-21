import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type FacultyStatus = "active" | "inactive";

export type FacultyFormState = {
	code: string;
	name: string;
	description: string;
	status: FacultyStatus;
};

type FacultyFormProps = {
	value: FacultyFormState;
	mode: "create" | "edit";
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: FacultyFormState) => void;
	onSubmit: () => void;
};

export const EMPTY_FACULTY_FORM: FacultyFormState = {
	code: "",
	name: "",
	description: "",
	status: "active",
};

export function FacultyForm({
	value,
	mode,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: FacultyFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="faculty-code">Mã khoa</Label>
					<Input
						id="faculty-code"
						value={value.code}
						onChange={(event) => onChange({ ...value, code: event.target.value })}
						placeholder="Ví dụ: SOICT"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="faculty-name">Tên khoa</Label>
					<Input
						id="faculty-name"
						value={value.name}
						onChange={(event) => onChange({ ...value, name: event.target.value })}
						placeholder="Ví dụ: Trường Công nghệ Thông tin và Truyền thông"
						required
					/>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="faculty-description">Mô tả</Label>
				<textarea
					id="faculty-description"
					className="min-h-32 border bg-background px-3 py-2 text-sm"
					value={value.description}
					onChange={(event) => onChange({ ...value, description: event.target.value })}
					placeholder="Ghi thông tin mô tả về khoa"
				/>
			</div>

			{mode === "edit" ? (
				<div className="flex flex-col gap-2 md:max-w-xs">
					<Label htmlFor="faculty-status">Trạng thái</Label>
					<select
						id="faculty-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({ ...value, status: event.target.value as FacultyStatus })
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
					{mode === "create" ? "Tạo khoa" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
