import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Save } from "lucide-react";
import { type FormEvent } from "react";

export type BuildingStatus = "active" | "inactive";

export type BuildingFormState = {
	code: string;
	status: BuildingStatus;
};

type BuildingFormProps = {
	value: BuildingFormState;
	mode: "create" | "edit";
	isPending?: boolean;
	canSubmit: boolean;
	onChange: (value: BuildingFormState) => void;
	onSubmit: () => void;
};

export const EMPTY_BUILDING_FORM: BuildingFormState = {
	code: "",
	status: "active",
};

export function BuildingForm({
	value,
	mode,
	isPending = false,
	canSubmit,
	onChange,
	onSubmit,
}: BuildingFormProps) {
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit();
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label htmlFor="building-code">Mã tòa nhà</Label>
				<Input
					id="building-code"
					value={value.code}
					onChange={(event) => onChange({ ...value, code: event.target.value })}
					placeholder="Ví dụ: D3"
					required
				/>
			</div>

			{mode === "edit" ? (
				<div className="flex flex-col gap-2 md:max-w-xs">
					<Label htmlFor="building-status">Trạng thái</Label>
					<select
						id="building-status"
						className="h-9 border bg-background px-3 text-sm"
						value={value.status}
						onChange={(event) =>
							onChange({ ...value, status: event.target.value as BuildingStatus })
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
					{mode === "create" ? "Tạo tòa nhà" : "Lưu thay đổi"}
				</Button>
			</div>
		</form>
	);
}
