import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type LecturerStatus = "active" | "inactive";

export type LecturerFacultyOption = {
	id: number;
	code: string;
	name: string;
	status: LecturerStatus;
};

export type LecturerDepartmentOption = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	status: LecturerStatus;
};

export type LecturerFormState = {
	name: string;
	dob: string;
	email: string;
	phone: string;
	position: string;
	facultyId: number;
	departmentId: number;
	status: LecturerStatus;
};

type LecturerFormProps = {
	value: LecturerFormState;
	mode: "create" | "edit";
	faculties: LecturerFacultyOption[];
	departments: LecturerDepartmentOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: LecturerFormState) => void;
	onSubmit: () => void;
};

export const EMPTY_LECTURER_FORM: LecturerFormState = {
	name: "",
	dob: "",
	email: "",
	phone: "",
	position: "",
	facultyId: 0,
	departmentId: 0,
	status: "active",
};

export function LecturerForm({
	value,
	mode,
	faculties,
	departments,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: LecturerFormProps) {
	const filteredDepartments = value.facultyId
		? departments.filter((item) => item.facultyId === value.facultyId)
		: departments;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label htmlFor="lecturer-name">Họ và tên</Label>
				<Input
					id="lecturer-name"
					value={value.name}
					onChange={(event) => onChange({ ...value, name: event.target.value })}
					required
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="lecturer-dob">Ngày sinh</Label>
					<Input
						id="lecturer-dob"
						type="date"
						value={value.dob}
						onChange={(event) => onChange({ ...value, dob: event.target.value })}
						required
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="lecturer-position">Chức vụ</Label>
					<Input
						id="lecturer-position"
						value={value.position}
						onChange={(event) =>
							onChange({ ...value, position: event.target.value })
						}
						required
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="lecturer-email">Email</Label>
					<Input
						id="lecturer-email"
						type="email"
						value={value.email}
						onChange={(event) => onChange({ ...value, email: event.target.value })}
						required
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="lecturer-phone">Số điện thoại</Label>
					<Input
						id="lecturer-phone"
						value={value.phone}
						onChange={(event) => onChange({ ...value, phone: event.target.value })}
						required
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="lecturer-faculty">Khoa</Label>
					<select
						id="lecturer-faculty"
						className="h-9 border bg-background px-3 text-sm"
						value={value.facultyId}
						onChange={(event) => {
							const facultyId = Number(event.target.value);
							const firstDepartmentId =
								departments.find((item) => item.facultyId === facultyId)?.id ?? 0;

							onChange({
								...value,
								facultyId,
								departmentId: firstDepartmentId,
							});
						}}
					>
						<option value={0}>Chọn khoa</option>
						{faculties.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name}
							</option>
						))}
					</select>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="lecturer-department">Bộ môn</Label>
					<select
						id="lecturer-department"
						className="h-9 border bg-background px-3 text-sm"
						value={value.departmentId}
						onChange={(event) =>
							onChange({ ...value, departmentId: Number(event.target.value) })
						}
						disabled={!value.facultyId}
						required
					>
						<option value={0}>Chọn bộ môn</option>
						{filteredDepartments.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{mode === "edit" ? (
				<div className="flex flex-col gap-2 md:max-w-xs">
					<Label htmlFor="lecturer-status">Trạng thái</Label>
					<select
						id="lecturer-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({
								...value,
								status: event.target.value as LecturerStatus,
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
					{mode === "create" ? "Tạo giảng viên" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
