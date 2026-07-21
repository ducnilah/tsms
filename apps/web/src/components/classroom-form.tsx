import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type ClassroomStatus = "active" | "inactive";
export type ClassroomType = "lecture" | "lab" | "seminar";

export type ClassroomBuildingOption = {
	id: number;
	code: string;
	status: ClassroomStatus;
};

export type ClassroomFormState = {
	code: string;
	buildingId: number;
	capacity: number;
	type: ClassroomType;
	status: ClassroomStatus;
};

type ClassroomFormProps = {
	value: ClassroomFormState;
	mode: "create" | "edit";
	buildings: ClassroomBuildingOption[];
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: ClassroomFormState) => void;
	onSubmit: () => void;
};

export const CLASSROOM_TYPE_OPTIONS = [
	{ label: "Lý thuyết", value: "lecture" },
	{ label: "Phòng lab", value: "lab" },
	{ label: "Seminar", value: "seminar" },
] as const;

export const EMPTY_CLASSROOM_FORM: ClassroomFormState = {
	code: "",
	buildingId: 0,
	capacity: 40,
	type: "lecture",
	status: "active",
};

export function ClassroomForm({
	value,
	mode,
	buildings,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: ClassroomFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="classroom-code">Mã phòng</Label>
					<Input
						id="classroom-code"
						value={value.code}
						onChange={(event) => onChange({ ...value, code: event.target.value })}
						placeholder="Ví dụ: D3-201"
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="classroom-building">Tòa nhà</Label>
					<select
						id="classroom-building"
						className="h-9 border bg-background px-3 text-sm"
						value={value.buildingId}
						onChange={(event) =>
							onChange({ ...value, buildingId: Number(event.target.value) })
						}
						required
					>
						<option value={0}>Chọn tòa nhà</option>
						{buildings.map((item) => (
							<option key={item.id} value={item.id}>
								{item.code}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="flex flex-col gap-2">
					<Label htmlFor="classroom-capacity">Sức chứa</Label>
					<Input
						id="classroom-capacity"
						type="number"
						min={1}
						value={value.capacity}
						onChange={(event) =>
							onChange({ ...value, capacity: Number(event.target.value) })
						}
						required
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="classroom-type">Loại phòng</Label>
					<select
						id="classroom-type"
						className="h-9 border bg-background px-3 text-sm"
						value={value.type}
						onChange={(event) =>
							onChange({ ...value, type: event.target.value as ClassroomType })
						}
					>
						{CLASSROOM_TYPE_OPTIONS.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</div>
			</div>

			{mode === "edit" ? (
				<div className="flex flex-col gap-2 md:max-w-xs">
					<Label htmlFor="classroom-status">Trạng thái</Label>
					<select
						id="classroom-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({ ...value, status: event.target.value as ClassroomStatus })
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
					{mode === "create" ? "Tạo phòng học" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
