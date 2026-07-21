import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type MajorStatus = "active" | "inactive";

export type MajorFacultyOption = {
	id: number;
	code: string;
	name: string;
	status: MajorStatus;
};

export type MajorFormState = {
	facultyId: number;
	code: string;
	name: string;
	description: string;
	status: MajorStatus;
};

type MajorFormProps = {
	value: MajorFormState;
	mode: "create" | "edit";
	faculties: MajorFacultyOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: MajorFormState) => void;
	onSubmit: () => void;
};

export const EMPTY_MAJOR_FORM: MajorFormState = {
	facultyId: 0,
	code: "",
	name: "",
	description: "",
	status: "active",
};

export function MajorForm({
	value,
	mode,
	faculties,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: MajorFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label htmlFor="major-faculty">Khoa quản lý</Label>
				<select
					id="major-faculty"
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
					<Label htmlFor="major-code">Mã ngành</Label>
					<Input
						id="major-code"
						value={value.code}
						onChange={(event) => onChange({ ...value, code: event.target.value })}
						placeholder="Ví dụ: IT1"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="major-name">Tên ngành</Label>
					<Input
						id="major-name"
						value={value.name}
						onChange={(event) => onChange({ ...value, name: event.target.value })}
						placeholder="Ví dụ: Khoa học máy tính"
						required
					/>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="major-description">Mô tả</Label>
				<textarea
					id="major-description"
					className="min-h-32 border bg-background px-3 py-2 text-sm"
					value={value.description}
					onChange={(event) =>
						onChange({ ...value, description: event.target.value })
					}
					placeholder="Ghi chú thêm về ngành học"
				/>
			</div>

			{mode === "edit" ? (
				<div className="flex flex-col gap-2 md:max-w-xs">
					<Label htmlFor="major-status">Trạng thái</Label>
					<select
						id="major-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({ ...value, status: event.target.value as MajorStatus })
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
					{mode === "create" ? "Tạo ngành học" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
