import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";

type StatusOption = {
	label: string;
	value: string;
};

type PaginationState = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

type ListControlsProps = {
	search: string;
	onSearchChange: (value: string) => void;
	status?: string;
	onStatusChange?: (value: string) => void;
	statusOptions?: StatusOption[];
	pagination?: PaginationState;
	onPageChange?: (page: number) => void;
};

export function ListControls({
	search,
	onSearchChange,
	status = "",
	onStatusChange,
	statusOptions = [],
	pagination,
	onPageChange,
}: ListControlsProps) {
	const canGoPrevious = Boolean(pagination && pagination.page > 1);
	const canGoNext = Boolean(
		pagination && pagination.totalPages > 0 && pagination.page < pagination.totalPages,
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
				<div className="flex flex-col gap-2">
					<Label htmlFor="list-search">Tìm kiếm</Label>
					<Input
						id="list-search"
						value={search}
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder="Nhập từ khóa tìm kiếm..."
					/>
				</div>

				{onStatusChange ? (
					<div className="flex flex-col gap-2">
						<Label htmlFor="list-status">Trạng thái</Label>
						<select
							id="list-status"
							className="h-9 border bg-background px-3 text-sm"
							value={status}
							onChange={(event) => onStatusChange(event.target.value)}
						>
							<option value="">Tất cả</option>
							{statusOptions.map((item) => (
								<option key={item.value} value={item.value}>
									{item.label}
								</option>
							))}
						</select>
					</div>
				) : null}
			</div>

			{pagination && onPageChange ? (
				<div className="flex flex-col gap-2 border bg-muted/30 px-3 py-2 text-muted-foreground text-xs md:flex-row md:items-center md:justify-between">
					<span>
						Trang {pagination.page} / {Math.max(pagination.totalPages, 1)} •{" "}
						{pagination.total} bản ghi
					</span>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!canGoPrevious}
							onClick={() => onPageChange(pagination.page - 1)}
						>
							Trước
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!canGoNext}
							onClick={() => onPageChange(pagination.page + 1)}
						>
							Sau
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
