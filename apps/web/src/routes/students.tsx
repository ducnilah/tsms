import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
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
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PaginationControls } from "@/components/pagination-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/students")({
	component: StudentsRoute,
});

type StudentStatus = "active" | "inactive";
type XlsxModule = typeof import("xlsx");

type StudentItem = {
	id: number;
	studentCode: string;
	name: string;
	dob: string | Date;
	email: string;
	phone: string;
	classId: number;
	programId: number;
	status: StudentStatus;
};

type FacultyOption = {
	id: number;
	code: string;
	name: string;
	status: StudentStatus;
};

type MajorOption = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	status: StudentStatus;
};

type ProgramOption = {
	id: number;
	majorId: number;
	code: string;
	name: string;
	academicYear: string;
	version: number;
	status: StudentStatus;
};

type StudentClassOption = {
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

type ImportStudentRow = {
	studentCode: string;
	name: string;
	dob: string;
	email: string;
	phone: string;
	className: string;
	status: StudentStatus;
};

type StudentExcelKey = keyof ImportStudentRow;

type StudentExcelColumn = {
	key: StudentExcelKey | "index";
	label: string;
	width: number;
	required?: boolean;
};

const STUDENT_EXCEL_COLUMNS = [
	{ key: "index", label: "STT", width: 6 },
	{ key: "studentCode", label: "Mã sinh viên", width: 16, required: true },
	{ key: "name", label: "Họ và tên", width: 32, required: true },
	{ key: "dob", label: "Ngày sinh", width: 16, required: true },
	{ key: "email", label: "Email", width: 34, required: true },
	{ key: "phone", label: "Số điện thoại", width: 18, required: true },
	{ key: "className", label: "Tên lớp", width: 28, required: true },
	{ key: "status", label: "Trạng thái", width: 18 },
] as const satisfies readonly StudentExcelColumn[];

const STUDENT_EXCEL_HEADERS = STUDENT_EXCEL_COLUMNS.map((column) => column.label);
const STUDENT_EXCEL_WIDTHS = STUDENT_EXCEL_COLUMNS.map((column) => ({
	wch: column.width,
}));

const STUDENT_STATUS_EXCEL_LABELS: Record<StudentStatus, string> = {
	active: "Đang học",
	inactive: "Ngừng học",
};

const STUDENT_STATUS_EXCEL_VALUES: Record<string, StudentStatus> = {
	active: "active",
	inactive: "inactive",
	"đang học": "active",
	"ngừng học": "inactive",
	"ngung hoc": "inactive",
};

function toDateInput(value: string | Date) {
	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "";
	}

	return date.toISOString().slice(0, 10);
}

function normalizeExcelDate(value: unknown, xlsx: XlsxModule) {
	if (value instanceof Date) {
		return toDateInput(value);
	}

	if (typeof value === "number") {
		const parsedDate = xlsx.SSF.parse_date_code(value);
		if (!parsedDate) return "";

		const month = String(parsedDate.m).padStart(2, "0");
		const day = String(parsedDate.d).padStart(2, "0");

		return `${parsedDate.y}-${month}-${day}`;
	}

	return String(value ?? "").trim();
}

function normalizeExcelText(value: unknown) {
	return String(value ?? "").trim().toLowerCase();
}

function normalizeStudentStatusFromExcel(value: unknown): StudentStatus {
	return STUDENT_STATUS_EXCEL_VALUES[normalizeExcelText(value)] ?? "active";
}

function getExcelCellValue(
	row: unknown[],
	headerIndexByLabel: Map<string, number>,
	label: string,
) {
	const index = headerIndexByLabel.get(normalizeExcelText(label));

	return typeof index === "number" ? row[index] : "";
}

function getStatusLabel(status: StudentStatus) {
	return status === "active" ? "Đang học" : "Ngừng học";
}

function StudentsRoute() {
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isChildRoute = currentPath.startsWith("/students/");
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
	const canRead = hasPermission(permissionMap, "students", "read");
	const canCreate = hasPermission(permissionMap, "students", "create");
	const canUpdate = hasPermission(permissionMap, "students", "update");
	const canDelete = hasPermission(permissionMap, "students", "delete");

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [facultyFilterId, setFacultyFilterId] = useState(0);
	const [majorFilterId, setMajorFilterId] = useState(0);
	const [programFilterId, setProgramFilterId] = useState(0);
	const [classFilterId, setClassFilterId] = useState(0);
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

	const studentsQuery = useQuery({
		...orpc["students.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				facultyId: facultyFilterId || undefined,
				majorId: majorFilterId || undefined,
				programId: programFilterId || undefined,
				classId: classFilterId || undefined,
				status: statusFilter ? (statusFilter as StudentStatus) : undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const majorsQuery = useQuery({
		...orpc["majors.options"].queryOptions({
			input: { facultyId: facultyFilterId || undefined },
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const programsQuery = useQuery({
		...orpc["programs.options"].queryOptions({
			input: { majorId: majorFilterId || undefined },
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const studentClassesQuery = useQuery({
		...orpc["studentClasses.options"].queryOptions({
			input: {
				facultyId: facultyFilterId || undefined,
				majorId: majorFilterId || undefined,
				programId: programFilterId || undefined,
			},
		}),
		enabled: !isChildRoute && Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const students = (studentsQuery.data?.students ?? []) as StudentItem[];
	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];
	const majors = (majorsQuery.data?.majors ?? []) as MajorOption[];
	const programs = (programsQuery.data?.programs ?? []) as ProgramOption[];
	const studentClasses = (studentClassesQuery.data?.studentClasses ??
		[]) as StudentClassOption[];
	const pagination = studentsQuery.data?.pagination;
	const programById = useMemo(
		() => new Map(programs.map((item) => [item.id, item])),
		[programs],
	);
	const classById = useMemo(
		() => new Map(studentClasses.map((item) => [item.id, item])),
		[studentClasses],
	);
	const selectedStudentIdSet = useMemo(
		() => new Set(selectedStudentIds),
		[selectedStudentIds],
	);
	const currentPageStudentIds = useMemo(
		() => students.map((item) => item.id),
		[students],
	);
	const hasVisibleStudents = currentPageStudentIds.length > 0;
	const isAllCurrentPageSelected =
		hasVisibleStudents && currentPageStudentIds.every((id) => selectedStudentIdSet.has(id));

	useEffect(() => {
		setSelectedStudentIds((currentIds) => {
			const nextIds = currentIds.filter((id) => currentPageStudentIds.includes(id));
			return nextIds.length === currentIds.length ? currentIds : nextIds;
		});
	}, [currentPageStudentIds]);

	const importRowsMutation = useMutation(
		orpc["students.importRows"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(
					`Import thành công ${data.total} dòng: tạo ${data.created}, cập nhật ${data.updated}`,
				);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const exportRowsMutation = useMutation(
		orpc["students.exportRows"].mutationOptions({
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteStudentMutation = useMutation(
		orpc["students.delete"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(`Đã xóa ${data.deletedCount} sinh viên`);
				setSelectedStudentIds([]);
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const toggleSelectAllCurrentPage = () => {
		setSelectedStudentIds(isAllCurrentPageSelected ? [] : currentPageStudentIds);
	};

	const toggleSelectStudent = (studentId: number) => {
		setSelectedStudentIds((currentIds) =>
			currentIds.includes(studentId)
				? currentIds.filter((id) => id !== studentId)
				: [...currentIds, studentId],
		);
	};

	const handleDeleteSelectedStudents = () => {
		if (selectedStudentIds.length === 0) return;
		if (!confirm(`Xóa ${selectedStudentIds.length} sinh viên đã chọn?`)) return;
		deleteStudentMutation.mutate({ studentIds: selectedStudentIds });
	};


	const handleExportExcel = async () => {
		try {
			const [data, xlsx] = await Promise.all([
				exportRowsMutation.mutateAsync({
					page: 1,
					limit: 100000,
					search: search.trim() || undefined,
					facultyId: facultyFilterId || undefined,
					majorId: majorFilterId || undefined,
					programId: programFilterId || undefined,
					classId: classFilterId || undefined,
					status: statusFilter ? (statusFilter as StudentStatus) : undefined,
				}),
				import("xlsx"),
			]);
			const selectedFacultyName =
				faculties.find((item) => item.id === facultyFilterId)?.name ?? "Tất cả";
			const selectedMajorName =
				majors.find((item) => item.id === majorFilterId)?.name ?? "Tất cả";
			const selectedClassName =
				studentClasses.find((item) => item.id === classFilterId)?.name ?? "Tất cả";
			const sheetRows = [
				["DANH SÁCH SINH VIÊN"],
				[`Khoa: ${selectedFacultyName}`],
				[`Ngành: ${selectedMajorName}`],
				[`Lớp: ${selectedClassName}`],
				[`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`],
				[],
				STUDENT_EXCEL_HEADERS,
				...data.rows.map((row, index) => [
					index + 1,
					row.studentCode,
					row.name,
					row.dob,
					row.email,
					row.phone,
					row.className,
					STUDENT_STATUS_EXCEL_LABELS[row.status as StudentStatus] ?? row.status,
				]),
			];
			const worksheet = xlsx.utils.aoa_to_sheet(sheetRows);
			worksheet["!cols"] = STUDENT_EXCEL_WIDTHS;
			worksheet["!merges"] = [
				{
					s: { r: 0, c: 0 },
					e: { r: 0, c: STUDENT_EXCEL_COLUMNS.length - 1 },
				},
			];
			const workbook = xlsx.utils.book_new();
			xlsx.utils.book_append_sheet(workbook, worksheet, "Students");
			xlsx.writeFile(
				workbook,
				`students-${new Date().toISOString().slice(0, 10)}.xlsx`,
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Không export được file Excel");
		}
	};

	const handleImportExcel = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) return;

		try {
			const [buffer, xlsx] = await Promise.all([
				file.arrayBuffer(),
				import("xlsx"),
			]);
			const workbook = xlsx.read(buffer, { type: "array", cellDates: true });
			const firstSheetName = workbook.SheetNames[0];
			const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

			if (!worksheet) {
				toast.error("File Excel không có sheet dữ liệu");
				return;
			}

			const sheetRows = xlsx.utils.sheet_to_json<unknown[]>(worksheet, {
				header: 1,
				defval: "",
			});
			const headerRowIndex = sheetRows.findIndex((row) =>
				row.some(
					(cell) =>
						normalizeExcelText(cell) === normalizeExcelText("Mã sinh viên"),
				),
			);

			if (headerRowIndex < 0) {
				toast.error("Không tìm thấy dòng tiêu đề Mã sinh viên trong file Excel");
				return;
			}

			const headerRow = sheetRows[headerRowIndex] ?? [];
			const headerIndexByLabel = new Map(
				headerRow.map((cell, index) => [normalizeExcelText(cell), index]),
			);
			const missingRequiredColumns = STUDENT_EXCEL_COLUMNS.filter(
				(column) =>
					"required" in column &&
					column.required &&
					!headerIndexByLabel.has(normalizeExcelText(column.label)),
			).map((column) => column.label);

			if (missingRequiredColumns.length > 0) {
				toast.error(`Thiếu cột bắt buộc: ${missingRequiredColumns.join(", ")}`);
				return;
			}

			const dataRows = sheetRows
				.slice(headerRowIndex + 1)
				.filter((row) => row.some((cell) => String(cell ?? "").trim().length > 0));
			const normalizedRows = dataRows.map((row) => ({
				studentCode: String(
					getExcelCellValue(row, headerIndexByLabel, "Mã sinh viên"),
				).trim(),
				name: String(getExcelCellValue(row, headerIndexByLabel, "Họ và tên")).trim(),
				dob: normalizeExcelDate(
					getExcelCellValue(row, headerIndexByLabel, "Ngày sinh"),
					xlsx,
				),
				email: String(getExcelCellValue(row, headerIndexByLabel, "Email")).trim(),
				phone: String(
					getExcelCellValue(row, headerIndexByLabel, "Số điện thoại"),
				).trim(),
				className: String(
					getExcelCellValue(row, headerIndexByLabel, "Tên lớp"),
				).trim(),
				status: normalizeStudentStatusFromExcel(
					getExcelCellValue(row, headerIndexByLabel, "Trạng thái"),
				),
			})) satisfies ImportStudentRow[];

			importRowsMutation.mutate({ rows: normalizedRows });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Không đọc được file Excel");
		}
	};

	if (isChildRoute) {
		return <Outlet />;
	}

	if (meQuery.isLoading && !currentUser) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return <main className="p-6 text-sm">Đang kiểm tra phiên đăng nhập...</main>;
	}

	if (!canRead) {
		return (
			<AppShell
				currentUser={currentUser}
				permissionMap={permissionMap}
				pageTitle="Quản lý sinh viên"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý sinh viên."
			>
				<Card>
					<CardHeader>
						<CardTitle>Không đủ quyền truy cập</CardTitle>
						<CardDescription>
							Hãy liên hệ quản trị viên nếu bạn cần được cấp quyền phù hợp.
						</CardDescription>
					</CardHeader>
				</Card>
			</AppShell>
		);
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Quản lý sinh viên"
			pageDescription="Quản lý hồ sơ sinh viên, lọc dữ liệu học vụ và import/export Excel."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle className="text-lg font-bold">Danh sách sinh viên</CardTitle>
							<CardDescription>
								Lọc hồ sơ sinh viên theo khoa, ngành, chương trình đào tạo và lớp.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							{canDelete && selectedStudentIds.length > 0 ? (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDeleteSelectedStudents}
									disabled={deleteStudentMutation.isPending}
								>
									<Trash2 data-icon="inline-start" />
									Xóa {selectedStudentIds.length} sinh viên
								</Button>
							) : null}
							<Button
								type="button"
								variant="outline"
								onClick={handleExportExcel}
								disabled={exportRowsMutation.isPending}
							>
								<Download data-icon="inline-start" />
								Export Excel
							</Button>
							{canCreate ? (
								<>
									<input
										ref={fileInputRef}
										type="file"
										accept=".xlsx,.xls"
										className="hidden"
										onChange={handleImportExcel}
									/>
									<Button
										type="button"
										variant="outline"
										disabled={importRowsMutation.isPending}
										onClick={() => fileInputRef.current?.click()}
									>
										<Upload data-icon="inline-start" />
										Import Excel
									</Button>
									<Button type="button" onClick={() => navigate({ to: "/students/create" })}>
										<Plus data-icon="inline-start" />
										Thêm sinh viên
									</Button>
								</>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="student-search">Tìm kiếm</Label>
							<Input
								id="student-search"
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Nhập mã, tên, email hoặc số điện thoại"
							/>
						</div>

						<div className="grid gap-3 md:grid-cols-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="student-filter-faculty">Khoa</Label>
								<select
									id="student-filter-faculty"
									className="h-9 border bg-background px-3 text-sm"
									value={facultyFilterId}
									onChange={(event) => {
										setFacultyFilterId(Number(event.target.value));
										setMajorFilterId(0);
										setProgramFilterId(0);
										setClassFilterId(0);
										setPage(1);
									}}
								>
									<option value={0}>Tất cả khoa</option>
									{faculties.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="student-filter-major">Ngành</Label>
								<select
									id="student-filter-major"
									className="h-9 border bg-background px-3 text-sm"
									value={majorFilterId}
									onChange={(event) => {
										setMajorFilterId(Number(event.target.value));
										setProgramFilterId(0);
										setClassFilterId(0);
										setPage(1);
									}}
								>
									<option value={0}>Tất cả ngành</option>
									{majors.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="student-filter-program">CTĐT</Label>
								<select
									id="student-filter-program"
									className="h-9 border bg-background px-3 text-sm"
									value={programFilterId}
									onChange={(event) => {
										setProgramFilterId(Number(event.target.value));
										setClassFilterId(0);
										setPage(1);
									}}
								>
									<option value={0}>Tất cả CTĐT</option>
									{programs.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="student-filter-class">Lớp</Label>
								<select
									id="student-filter-class"
									className="h-9 border bg-background px-3 text-sm"
									value={classFilterId}
									onChange={(event) => {
										setClassFilterId(Number(event.target.value));
										setPage(1);
									}}
								>
									<option value={0}>Tất cả lớp</option>
									{studentClasses.map((item) => (
										<option key={item.id} value={item.id}>
											{item.code} - {item.name}
										</option>
									))}
								</select>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="student-filter-status">Trạng thái</Label>
								<select
									id="student-filter-status"
									className="h-9 border bg-background px-3 text-sm"
									value={statusFilter}
									onChange={(event) => {
										setStatusFilter(event.target.value);
										setPage(1);
									}}
								>
									<option value="">Tất cả trạng thái</option>
									<option value="active">Đang học</option>
									<option value="inactive">Ngừng học</option>
								</select>
							</div>
						</div>
					</div>

					<div className="overflow-hidden border">
						<div className="max-h-[31rem] overflow-y-auto">
							<table className="w-full table-fixed text-[15px]">
								<colgroup>
									<col className="w-12" />
									<col className="w-50"/>
									<col className="w-52" />
									<col className="w-56" />
									<col className="w-66" />
									<col className="w-30" />
									<col className="w-32" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-muted text-left">
									<tr>
										<th className="w-12 px-4 py-3">
											<input
												type="checkbox"
												aria-label="Chọn tất cả sinh viên trên trang hiện tại"
												checked={isAllCurrentPageSelected}
												disabled={!hasVisibleStudents}
												onChange={toggleSelectAllCurrentPage}
											/>
										</th>
										<th className="px-4 py-3 font-medium">Sinh viên</th>
										<th className="px-4 py-3 font-medium">Lớp</th>
										<th className="px-4 py-3 font-medium">CTĐT</th>
										<th className="px-4 py-3 font-medium">Liên hệ</th>
										<th className="px-4 py-3 pl-4 font-medium">Trạng thái</th>
										<th className="px-4 py-3 text-right font-medium">Thao tác</th>
									</tr>
								</thead>
								<tbody>
									{studentsQuery.isLoading ||
									facultiesQuery.isLoading ||
									majorsQuery.isLoading ||
									programsQuery.isLoading ||
									studentClassesQuery.isLoading ? (
										Array.from({ length: 8 }).map((_, index) => (
											<tr key={index} className="border-t">
												<td colSpan={7} className="px-4 py-4">
													<Skeleton className="h-6 w-full" />
												</td>
											</tr>
										))
									) : studentsQuery.error ||
										facultiesQuery.error ||
										majorsQuery.error ||
										programsQuery.error ||
										studentClassesQuery.error ? (
										<tr>
											<td colSpan={7} className="px-4 py-10 text-center text-destructive">
												Không thể tải danh sách sinh viên.
											</td>
										</tr>
									) : students.length === 0 ? (
										<tr>
											<td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
												Không tìm thấy sinh viên phù hợp.
											</td>
										</tr>
									) : (
										students.map((item) => {
											const studentClass = classById.get(item.classId);
											const program = programById.get(item.programId);

											return (
												<tr key={item.id} className="border-t hover:bg-muted/40">
													<td className="px-4 py-4">
														<input
															type="checkbox"
															aria-label={`Chọn sinh viên ${item.name}`}
															checked={selectedStudentIdSet.has(item.id)}
															onChange={() => toggleSelectStudent(item.id)}
														/>
													</td>
													<td className="px-4 py-4">
														<div className="truncate font-medium">{item.name}</div>
														<div className="text-muted-foreground text-xs">
															{item.studentCode} • {toDateInput(item.dob)}
														</div>
													</td>
													<td className="px-4 py-4">
														<div className="truncate">
															{studentClass?.name ?? `ID ${item.classId}`}
														</div>
														<div className="text-muted-foreground text-xs">
															{studentClass?.code ?? ""}
														</div>
													</td>
													<td className="px-4 py-4">
														<div className="truncate">
															{program?.name ?? `ID ${item.programId}`}
														</div>
														<div className="text-muted-foreground text-xs">
															{program?.code ?? ""}
														</div>
													</td>
													<td className="px-4 py-4">
														<div className="truncate">{item.email}</div>
														<div className="text-muted-foreground text-xs">{item.phone}</div>
													</td>
													<td className="px-4 py-4">
														<span className="inline-flex w-fit items-center rounded border px-2.5 py-1 text-xs">
															{getStatusLabel(item.status)}
														</span>
													</td>
													<td className="px-4 py-4 text-right">
												{canUpdate ? (
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															navigate({
																to: "/students/$studentId/edit",
																params: { studentId: String(item.id) },
															})
														}
													>
														<Pencil data-icon="inline-start" />
														Sửa
													</Button>
												) : null}
											</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					<PaginationControls
						pagination={pagination}
						limit={limit}
						onLimitChange={(nextLimit) => {
							setLimit(nextLimit);
							setPage(1);
						}}
						onPageChange={setPage}
					/>
				</CardContent>
			</Card>
		</AppShell>
	);
}
