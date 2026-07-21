import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type CourseStatus = "active" | "inactive";

export type CourseFacultyOption = {
	id: number;
	code: string;
	name: string;
	status: CourseStatus;
};

export type CourseDepartmentOption = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	status: CourseStatus;
};

export type CourseFormState = {
	code: string;
	name: string;
	lectureCredits: number;
	practiceCredits: number;
	facultyId: number;
	departmentId: number;
	description: string;
	status: CourseStatus;
};

type CourseFormProps = {
	value: CourseFormState;
	mode: "create" | "edit";
	faculties: CourseFacultyOption[];
	departments: CourseDepartmentOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: CourseFormState) => void;
	onSubmit: () => void;
};

export const EMPTY_COURSE_FORM: CourseFormState = {
	code: "",
	name: "",
	lectureCredits: 2,
	practiceCredits: 1,
	facultyId: 0,
	departmentId: 0,
	description: "",
	status: "active",
};

export function isValidCourseCredit(value: number) {
	return (
		Number.isInteger(value * 10) &&
		Number.isInteger(value * 2) &&
		(value === 0 || value >= 1)
	);
}

export function CourseForm({
	value,
	mode,
	faculties,
	departments,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: CourseFormProps) {
	const filteredDepartments = value.facultyId
		? departments.filter((item) => item.facultyId === value.facultyId)
		: departments;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="course-code">Mã học phần</Label>
					<Input
						id="course-code"
						value={value.code}
						onChange={(event) => onChange({ ...value, code: event.target.value })}
						placeholder="Ví dụ: IT3090-2026"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="course-name">Tên học phần</Label>
					<Input
						id="course-name"
						value={value.name}
						onChange={(event) => onChange({ ...value, name: event.target.value })}
						placeholder="Ví dụ: Cơ sở dữ liệu"
						required
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="course-faculty">Khoa</Label>
					<select
						id="course-faculty"
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
					<Label htmlFor="course-department">Bộ môn</Label>
					<select
						id="course-department"
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

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="course-lecture-credits">Tín chỉ lý thuyết</Label>
					<Input
						id="course-lecture-credits"
						type="number"
						min={0}
						step={0.5}
						value={value.lectureCredits}
						onChange={(event) =>
							onChange({ ...value, lectureCredits: Number(event.target.value) })
						}
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="course-practice-credits">Tín chỉ thực hành</Label>
					<Input
						id="course-practice-credits"
						type="number"
						min={0}
						step={0.5}
						value={value.practiceCredits}
						onChange={(event) =>
							onChange({ ...value, practiceCredits: Number(event.target.value) })
						}
						required
					/>
				</div>
			</div>

			<p className="text-muted-foreground text-xs">
				Hệ thống tự tính số buổi: 1 tín chỉ lý thuyết = 15 buổi, 1 tín chỉ
				thực hành = 30 buổi.
			</p>

			<div className="flex flex-col gap-2">
				<Label htmlFor="course-description">Mô tả</Label>
				<textarea
					id="course-description"
					className="min-h-28 border bg-background px-3 py-2 text-sm"
					value={value.description}
					onChange={(event) =>
						onChange({ ...value, description: event.target.value })
					}
					placeholder="Ghi chú thêm về học phần"
				/>
			</div>

			{mode === "edit" ? (
				<div className="flex flex-col gap-2 md:max-w-xs">
					<Label htmlFor="course-status">Trạng thái</Label>
					<select
						id="course-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({ ...value, status: event.target.value as CourseStatus })
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
					{mode === "create" ? "Tạo học phần" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
