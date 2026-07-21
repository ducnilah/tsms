import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type StudentStatus = "active" | "inactive";

export type StudentProgramOption = {
	id: number;
	majorId: number;
	code: string;
	name: string;
	academicYear: string;
	version: number;
	status: StudentStatus;
};

export type StudentClassOption = {
	id: number;
	code: string;
	name: string;
	facultyId: number;
	majorId: number;
	programId: number;
	facultyCode: string;
	facultyName: string;
	majorCode: string;
	majorName: string;
	programCode: string;
	programName: string;
};

export type StudentFormState = {
	studentCode: string;
	name: string;
	dob: string;
	email: string;
	phone: string;
	classId: number;
	programId: number;
	status: StudentStatus;
};

type StudentFormProps = {
	value: StudentFormState;
	mode: "create" | "edit";
	programs: StudentProgramOption[];
	studentClasses: StudentClassOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: StudentFormState) => void;
	onSubmit: () => void;
};

export const EMPTY_STUDENT_FORM: StudentFormState = {
	studentCode: "",
	name: "",
	dob: "",
	email: "",
	phone: "",
	classId: 0,
	programId: 0,
	status: "active",
};

export function StudentForm({
	value,
	mode,
	programs,
	studentClasses,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: StudentFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="student-code">Mã sinh viên</Label>
					<Input
						id="student-code"
						value={value.studentCode}
						onChange={(event) =>
							onChange({ ...value, studentCode: event.target.value })
						}
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="student-name">Họ và tên</Label>
					<Input
						id="student-name"
						value={value.name}
						onChange={(event) => onChange({ ...value, name: event.target.value })}
						required
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="student-dob">Ngày sinh</Label>
					<Input
						id="student-dob"
						type="date"
						value={value.dob}
						onChange={(event) => onChange({ ...value, dob: event.target.value })}
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="student-phone">Số điện thoại</Label>
					<Input
						id="student-phone"
						value={value.phone}
						onChange={(event) => onChange({ ...value, phone: event.target.value })}
						required
					/>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="student-email">Email</Label>
				<Input
					id="student-email"
					type="email"
					value={value.email}
					onChange={(event) => onChange({ ...value, email: event.target.value })}
					required
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="student-class">Lớp sinh viên</Label>
					<select
						id="student-class"
						className="h-9 border bg-background px-3 text-sm"
						value={value.classId}
						onChange={(event) => {
							const classId = Number(event.target.value);
							const classItem = studentClasses.find((item) => item.id === classId);
							onChange({
								...value,
								classId,
								programId: classItem?.programId ?? value.programId,
							});
						}}
						required
					>
						<option value={0}>Chọn lớp</option>
						{studentClasses.map((item) => (
							<option key={item.id} value={item.id}>
								{item.code} - {item.name}
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="student-program">Chương trình đào tạo</Label>
					<select
						id="student-program"
						className="h-9 border bg-background px-3 text-sm"
						value={value.programId}
						onChange={(event) =>
							onChange({ ...value, programId: Number(event.target.value) })
						}
						required
					>
						<option value={0}>Chọn CTĐT</option>
						{programs.map((item) => (
							<option key={item.id} value={item.id}>
								{item.code} - {item.name}
							</option>
						))}
					</select>
				</div>
			</div>

			{mode === "edit" ? (
				<div className="flex flex-col gap-2 md:max-w-xs">
					<Label htmlFor="student-status">Trạng thái</Label>
					<select
						id="student-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({ ...value, status: event.target.value as StudentStatus })
						}
					>
						<option value="active">Đang học</option>
						<option value="inactive">Ngừng học</option>
					</select>
				</div>
			) : null}

			<div className="flex justify-end">
				<Button type="submit" disabled={!canSubmit || isPending}>
					<Save data-icon="inline-start" />
					{mode === "create" ? "Tạo sinh viên" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
