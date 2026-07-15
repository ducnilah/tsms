import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@tsms/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@tsms/ui/components/card";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Skeleton } from "@tsms/ui/components/skeleton";
import { CalendarDays, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ListControls } from "@/components/list-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/academic-years")({
	component: AcademicYearsRoute,
});

type AcademicYearStatus = "active" | "draft" | "locked" | "archived";

type AcademicYearItem = {
	id: number;
	code: string;
	name: string;
	startDate: string;
	endDate: string;
	status: AcademicYearStatus;
};

type AcademicYearFormState = {
	academicYearId: number;
	code: string;
	name: string;
	startDate: string;
	endDate: string;
	status: AcademicYearStatus;
};

const EMPTY_ACADEMIC_YEAR_FORM: AcademicYearFormState = {
	academicYearId: 0,
	code: "",
	name: "",
	startDate: "",
	endDate: "",
	status: "active",
};

const ACADEMIC_YEAR_STATUS_OPTIONS = [
	{ label: "Đang hoạt động", value: "active" },
	{ label: "Nháp", value: "draft" },
	{ label: "Đã khóa", value: "locked" },
	{ label: "Lưu trữ", value: "archived" },
] as const;

function AcademicYearsRoute() {
	const navigate = useNavigate();
	const meQuery = useQuery({
		...orpc["auth.me"].queryOptions(),
		retry: false,
		meta: { skipErrorToast: true },
	});

	useEffect(() => {
		if (meQuery.isError && !meQuery.data?.user) {
			navigate({ to: "/login" });
		}
	}, [meQuery.data, meQuery.isError, navigate]);

	const currentUser = meQuery.data?.user ?? null;
	const permissionMap = meQuery.data?.permissionMap ?? {};
	const canRead = hasPermission(permissionMap, "academic-years", "read");
	const canCreate = hasPermission(permissionMap, "academic-years", "create");
	const canUpdate = hasPermission(permissionMap, "academic-years", "update");
	const canDelete = hasPermission(permissionMap, "academic-years", "delete");

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const limit = 6;

	const academicYearsQuery = useQuery({
		...orpc["academicYears.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as AcademicYearStatus) : undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(0);
	const [isCreatingAcademicYear, setIsCreatingAcademicYear] = useState(false);
	const [academicYearForm, setAcademicYearForm] =
		useState<AcademicYearFormState>(EMPTY_ACADEMIC_YEAR_FORM);

	const academicYears = (academicYearsQuery.data?.academicYears ??
		[]) as AcademicYearItem[];
	const pagination = academicYearsQuery.data?.pagination;
	const selectedAcademicYear = useMemo(
		() =>
			academicYears.find((item) => item.id === selectedAcademicYearId) ?? null,
		[academicYears, selectedAcademicYearId],
	);

	useEffect(() => {
		if (
			!isCreatingAcademicYear &&
			selectedAcademicYearId === 0 &&
			academicYears.length > 0
		) {
			setSelectedAcademicYearId(academicYears[0].id);
		}
	}, [academicYears, isCreatingAcademicYear, selectedAcademicYearId]);

	useEffect(() => {
		if (academicYears.length === 0) {
			setSelectedAcademicYearId(0);
			if (!isCreatingAcademicYear) {
				setAcademicYearForm(EMPTY_ACADEMIC_YEAR_FORM);
			}
			return;
		}

		if (
			!isCreatingAcademicYear &&
			!academicYears.some((item) => item.id === selectedAcademicYearId)
		) {
			setSelectedAcademicYearId(academicYears[0].id);
		}
	}, [academicYears, isCreatingAcademicYear, selectedAcademicYearId]);

	useEffect(() => {
		if (isCreatingAcademicYear || !selectedAcademicYear) {
			return;
		}

		setAcademicYearForm({
			academicYearId: selectedAcademicYear.id,
			code: selectedAcademicYear.code,
			name: selectedAcademicYear.name,
			startDate: selectedAcademicYear.startDate,
			endDate: selectedAcademicYear.endDate,
			status: selectedAcademicYear.status,
		});
	}, [isCreatingAcademicYear, selectedAcademicYear]);

	const invalidateAcademicYears = async () => {
		await queryClient.invalidateQueries();
	};

	const createAcademicYearMutation = useMutation(
		orpc["academicYears.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo năm học");
				setIsCreatingAcademicYear(false);
				setSelectedAcademicYearId(data.academicYear.id);
				await invalidateAcademicYears();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const updateAcademicYearMutation = useMutation(
		orpc["academicYears.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật năm học");
				setIsCreatingAcademicYear(false);
				setSelectedAcademicYearId(data.academicYear.id);
				await invalidateAcademicYears();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const changeStatusMutation = useMutation(
		orpc["academicYears.changeStatus"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã đổi trạng thái năm học");
				await invalidateAcademicYears();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const deleteAcademicYearMutation = useMutation(
		orpc["academicYears.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa năm học");
				setIsCreatingAcademicYear(false);
				setAcademicYearForm(EMPTY_ACADEMIC_YEAR_FORM);
				await invalidateAcademicYears();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSaveAcademicYear = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (academicYearForm.endDate <= academicYearForm.startDate) {
			toast.error("Ngày kết thúc phải sau ngày bắt đầu");
			return;
		}

		if (academicYearForm.academicYearId > 0) {
			updateAcademicYearMutation.mutate(academicYearForm);
			return;
		}

		createAcademicYearMutation.mutate({
			code: academicYearForm.code,
			name: academicYearForm.name,
			startDate: academicYearForm.startDate,
			endDate: academicYearForm.endDate,
			status: academicYearForm.status,
		});
	};

	const beginCreateAcademicYear = () => {
		setIsCreatingAcademicYear(true);
		setSelectedAcademicYearId(0);
		setAcademicYearForm(EMPTY_ACADEMIC_YEAR_FORM);
	};

	if (meQuery.isLoading) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return null;
	}

	if (!canRead) {
		return (
			<AppShell
				currentUser={currentUser}
				permissionMap={permissionMap}
				pageTitle="Quản lý năm học"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý năm học."
			>
				<Card>
					<CardContent className="p-6 text-muted-foreground text-sm">
						Vui lòng liên hệ quản trị viên để được cấp quyền phù hợp.
					</CardContent>
				</Card>
			</AppShell>
		);
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Quản lý năm học"
			pageDescription="Quản lý mốc thời gian, trạng thái mở/khóa và vòng đời năm học."
		>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
				<Card>
					<CardHeader>
						<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
							<div>
								<CardTitle>Danh sách năm học</CardTitle>
								<CardDescription>Tìm theo mã/tên và lọc trạng thái năm học.</CardDescription>
							</div>
							{canCreate ? (
								<Button type="button" variant="outline" onClick={beginCreateAcademicYear}>
									<Plus data-icon="inline-start" />
									Tạo năm học
								</Button>
							) : null}
						</div>
					</CardHeader>
					<CardContent>
						<div className="mb-4">
							<ListControls
								search={search}
								onSearchChange={(value) => {
									setSearch(value);
									setPage(1);
								}}
								status={statusFilter}
								onStatusChange={(value) => {
									setStatusFilter(value);
									setPage(1);
								}}
								statusOptions={ACADEMIC_YEAR_STATUS_OPTIONS}
								pagination={pagination}
								onPageChange={setPage}
							/>
						</div>

						{academicYearsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : academicYearsQuery.error ? (
							<p className="text-destructive text-sm">Không thể tải danh sách năm học.</p>
						) : academicYears.length === 0 ? (
							<div className="flex flex-col items-center gap-3 border border-dashed p-8 text-center">
								<CalendarDays className="size-10 text-muted-foreground" />
								<div>
									<p className="font-medium">Chưa có năm học</p>
									<p className="text-muted-foreground text-sm">
										Hãy tạo năm học đầu tiên hoặc đổi điều kiện tìm kiếm.
									</p>
								</div>
							</div>
						) : (
							<div className="overflow-x-auto border">
								<table className="w-full min-w-[760px] text-sm">
									<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
										<tr>
											<th className="p-3">Năm học</th>
											<th className="p-3">Thời gian</th>
											<th className="p-3">Trạng thái</th>
											<th className="p-3 text-right">Thao tác</th>
										</tr>
									</thead>
									<tbody>
										{academicYears.map((item) => (
											<tr
												key={item.id}
												className={
													selectedAcademicYearId === item.id
														? "border-t bg-muted/70"
														: "border-t hover:bg-muted/40"
												}
											>
												<td className="p-3">
													<div className="font-medium">{item.name}</div>
													<div className="text-muted-foreground text-xs">{item.code}</div>
												</td>
												<td className="p-3">
													{item.startDate} → {item.endDate}
												</td>
												<td className="p-3">{item.status}</td>
												<td className="p-3 text-right">
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() => {
															setIsCreatingAcademicYear(false);
															setSelectedAcademicYearId(item.id);
														}}
													>
														<Pencil data-icon="inline-start" />
														Sửa
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>
							{academicYearForm.academicYearId > 0 ? "Cập nhật năm học" : "Tạo năm học"}
						</CardTitle>
						<CardDescription>
							Ngày dùng định dạng YYYY-MM-DD và backend sẽ kiểm tra trùng mã.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSaveAcademicYear} className="flex flex-col gap-4">
							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="academic-year-code">Mã năm học</Label>
									<Input
										id="academic-year-code"
										value={academicYearForm.code}
										onChange={(event) =>
											setAcademicYearForm((current) => ({
												...current,
												code: event.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="academic-year-status">Trạng thái</Label>
									<select
										id="academic-year-status"
										className="h-9 border bg-background px-3 text-sm"
										value={academicYearForm.status}
										onChange={(event) =>
											setAcademicYearForm((current) => ({
												...current,
												status: event.target.value as AcademicYearStatus,
											}))
										}
									>
										{ACADEMIC_YEAR_STATUS_OPTIONS.map((item) => (
											<option key={item.value} value={item.value}>
												{item.label}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="academic-year-name">Tên năm học</Label>
								<Input
									id="academic-year-name"
									value={academicYearForm.name}
									onChange={(event) =>
										setAcademicYearForm((current) => ({
											...current,
											name: event.target.value,
										}))
									}
									required
								/>
							</div>

							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="academic-year-start">Ngày bắt đầu</Label>
									<Input
										id="academic-year-start"
										type="date"
										value={academicYearForm.startDate}
										onChange={(event) =>
											setAcademicYearForm((current) => ({
												...current,
												startDate: event.target.value,
											}))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="academic-year-end">Ngày kết thúc</Label>
									<Input
										id="academic-year-end"
										type="date"
										value={academicYearForm.endDate}
										onChange={(event) =>
											setAcademicYearForm((current) => ({
												...current,
												endDate: event.target.value,
											}))
										}
										required
									/>
								</div>
							</div>

							<div className="flex flex-wrap gap-2">
								{(academicYearForm.academicYearId > 0 ? canUpdate : canCreate) ? (
									<Button
										type="submit"
										disabled={
											createAcademicYearMutation.isPending ||
											updateAcademicYearMutation.isPending
										}
									>
										<Save data-icon="inline-start" />
										Lưu năm học
									</Button>
								) : null}
								<Button type="button" variant="outline" onClick={beginCreateAcademicYear}>
									Làm mới
								</Button>
								{academicYearForm.academicYearId > 0 && canUpdate ? (
									<Button
										type="button"
										variant="outline"
										disabled={changeStatusMutation.isPending}
										onClick={() =>
											changeStatusMutation.mutate({
												academicYearId: academicYearForm.academicYearId,
												status: academicYearForm.status,
											})
										}
									>
										Đổi trạng thái
									</Button>
								) : null}
								{academicYearForm.academicYearId > 0 && canDelete ? (
									<Button
										type="button"
										variant="destructive"
										disabled={deleteAcademicYearMutation.isPending}
										onClick={() => {
											if (
												selectedAcademicYear &&
												confirm(`Xóa năm học ${selectedAcademicYear.code}?`)
											) {
												deleteAcademicYearMutation.mutate({
													academicYearId: selectedAcademicYear.id,
												});
											}
										}}
									>
										<Trash2 data-icon="inline-start" />
										Xóa
									</Button>
								) : null}
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
