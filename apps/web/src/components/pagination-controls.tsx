import { Button } from "@tsms/ui/components/button";
import { Label } from "@tsms/ui/components/label";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";

type PaginationState = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

type PaginationItem = number | "...";

type PaginationControlsProps = {
	pagination?: PaginationState;
	limit: number;
	limitOptions?: number[];
	onPageChange: (page: number) => void;
	onLimitChange: (limit: number) => void;
};

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
	if (totalPages <= 1) return [1];
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}

	const pages = new Set<number>([1, totalPages]);
	const startPage = Math.max(2, currentPage - 2);
	const endPage = Math.min(totalPages - 1, currentPage + 2);

	for (let page = startPage; page <= endPage; page++) {
		pages.add(page);
	}

	const sortedPages = Array.from(pages).sort((first, second) => first - second);
	const items: PaginationItem[] = [];

	for (const page of sortedPages) {
		const previousItem = items[items.length - 1];

		if (typeof previousItem === "number" && page - previousItem > 1) {
			items.push("...");
		}

		items.push(page);
	}

	return items;
}

export function PaginationControls({
	pagination,
	limit,
	limitOptions = [2, 5, 10, 20, 50, 100],
	onPageChange,
	onLimitChange,
}: PaginationControlsProps) {
	const limitSelectId = useId();
	const currentPage = pagination?.page ?? 1;
	const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
	const total = pagination?.total ?? 0;
	const paginationItems = getPaginationItems(currentPage, totalPages);
	const canGoPrevious = currentPage > 1;
	const canGoNext = currentPage < totalPages;

	return (
		<div className="flex w-full flex-col gap-3 border bg-muted/30 px-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
			<div className="flex items-center gap-3 text-muted-foreground text-sm">
				<Label htmlFor={limitSelectId} className="text-xs">
					Hiển thị
				</Label>
				<select
					id={limitSelectId}
					className="h-8 border bg-background px-2 text-xs"
					value={limit}
					onChange={(event) => onLimitChange(Number(event.target.value))}
				>
					{limitOptions.map((item) => (
						<option key={item} value={item}>
							{item} / trang
						</option>
					))}
				</select>
				<span className="whitespace-nowrap">{total} bản ghi</span>
			</div>

			<div className="flex flex-wrap items-center gap-1">
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					disabled={!canGoPrevious}
					onClick={() => onPageChange(currentPage - 1)}
					aria-label="Trang trước"
				>
					<ChevronLeft />
				</Button>

				{paginationItems.map((item, index) =>
					item === "..." ? (
						<span
							key={`ellipsis-${index}`}
							className="flex h-8 min-w-8 items-center justify-center px-2 text-muted-foreground text-xs"
						>
							...
						</span>
					) : (
						<Button
							key={item}
							type="button"
							variant={item === currentPage ? "default" : "outline"}
							size="sm"
							className="min-w-8 px-2"
							onClick={() => onPageChange(item)}
						>
							{item}
						</Button>
					),
				)}

				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					disabled={!canGoNext}
					onClick={() => onPageChange(currentPage + 1)}
					aria-label="Trang sau"
				>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}
