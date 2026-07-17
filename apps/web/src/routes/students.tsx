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
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

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

type StudentDetail = StudentItem & {
	classCode: string;
	className: string;
	programCode: string;
	programName: string;
	majorName: string;
	facultyName: string;
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

type StudentFormState = {
	studentId: number;
	studentCode: string;
	name: string;
	dob: string;
	email: string;
	phone: string;
	classId: number;
	programId: number;
	status: StudentStatus;
};

type ImportStudentRow = {
	studentCode: string;
	name: string;
	dob: string;
	email: string;
	phone: string;
	classCode: string;
	programCode: string;
	status: StudentStatus;
};

const EMPTY_STUDENT_FORM: StudentFormState = {
	studentId: 0,
	studentCode: "",
	name: "",
	dob: "",
	email: "",
	phone: "",
	classId: 0,
	programId: 0,
	status: "active",
};

const STUDENT_EXCEL_HEADERS = [
	"studentCode",
	"name",
	"dob",
	"email",
	"phone",
	"classCode",
	"programCode",
	"status",
];

export const Route = createFileRoute("/students")({
	component: StudentsRoute,
});

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
		const parsed = xlsx.SSF.parse_date_code(value);
		if (!parsed) {
			return "";
		}

		return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
	}

	return String(value ?? "").trim();
}

function StudentsRoute() {
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement | null>(null);

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
	const [search, setSearch] = useState("");
	const [facultyFilterId, setFacultyFilterId] = useState(0);
	const [majorFilterId, setMajorFilterId] = useState(0);
	const [programFilterId, setProgramFilterId] = useState(0);
	const [classFilterId, setClassFilterId] = useState(0);
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedStudentId, setSelectedStudentId] = useState(0);
	const [isCreatingStudent, setIsCreatingStudent] = useState(false);
	const [isEditingStudent, setIsEditingStudent] = useState(false);
	const [studentForm, setStudentForm] = useState<StudentFormState>(EMPTY_STUDENT_FORM);
	const limit = 6;

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
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const majorsQuery = useQuery({
		...orpc["majors.options"].queryOptions({
			input: { facultyId: facultyFilterId || undefined },
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const programsQuery = useQuery({
		...orpc["programs.options"].queryOptions({
			input: { majorId: majorFilterId || undefined },
		}),
		enabled: Boolean(currentUser) && canRead,
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
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const selectedStudentQuery = useQuery({
		...orpc["students.byId"].queryOptions({
			input: { studentId: selectedStudentId },
		}),
		enabled: Boolean(currentUser) && canRead && selectedStudentId > 0,
		meta: { skipErrorToast: true },
	});

	const students = (studentsQuery.data?.students ?? []) as StudentItem[];
	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];
	const majors = (majorsQuery.data?.majors ?? []) as MajorOption[];
	const programs = (programsQuery.data?.programs ?? []) as ProgramOption[];
	const studentClasses = (studentClassesQuery.data?.studentClasses ??
		[]) as StudentClassOption[];
	const selectedStudent = selectedStudentQuery.data?.student as StudentDetail | undefined;
	const pagination = studentsQuery.data?.pagination;

	const canGoPrevious = Boolean(pagination && pagination.page > 1);
	const canGoNext = Boolean(
		pagination && pagination.totalPages > 0 && pagination.page < pagination.totalPages,
	);

	const getClassName = (classId: number) =>
		studentClasses.find((item) => item.id === classId)?.name ?? "Không xác định";
	const getProgramName = (programId: number) =>
		programs.find((item) => item.id === programId)?.name ?? "Không xác định";
	const getStatusLabel = (status: StudentStatus) =>
		status === "active" ? "Đang học" : "Ngừng học";

	useEffect(() => {
		if (
			selectedStudentId > 0 &&
			!students.some((item) => item.id === selectedStudentId)
		) {
			setSelectedStudentId(0);
			setIsEditingStudent(false);
		}
	}, [students, selectedStudentId]);

	useEffect(() => {
		if (isCreatingStudent || !selectedStudent) {
			return;
		}

		setStudentForm({
			studentId: selectedStudent.id,
			studentCode: selectedStudent.studentCode,
			name: selectedStudent.name,
			dob: toDateInput(selectedStudent.dob),
			email: selectedStudent.email,
			phone: selectedStudent.phone,
			classId: selectedStudent.classId,
			programId: selectedStudent.programId,
			status: selectedStudent.status,
		});
	}, [isCreatingStudent, selectedStudent]);

	const invalidateStudentQueries = async () => {
		await queryClient.invalidateQueries();
	};

	const createStudentMutation = useMutation(
		orpc["students.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo sinh viên");
				setIsCreatingStudent(false);
				setIsEditingStudent(false);
				setSelectedStudentId(data.student.id);
				await invalidateStudentQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateStudentMutation = useMutation(
		orpc["students.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật sinh viên");
				setIsCreatingStudent(false);
				setIsEditingStudent(false);
				setSelectedStudentId(data.student.id);
				await invalidateStudentQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteStudentMutation = useMutation(
		orpc["students.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa sinh viên");
				setIsCreatingStudent(false);
				setIsEditingStudent(false);
				setSelectedStudentId(0);
				setStudentForm(EMPTY_STUDENT_FORM);
				await invalidateStudentQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const importRowsMutation = useMutation(
		orpc["students.importRows"].mutationOptions({
			onSuccess: async (data) => {
				toast.success(
					`Đã import ${data.total} sinh viên (${data.created} mới, ${data.updated} cập nhật)`,
				);
				await invalidateStudentQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const exportRowsMutation = useMutation(
		orpc["students.exportRows"].mutationOptions(),
	);

	const beginCreateStudent = () => {
		setIsCreatingStudent(true);
		setIsEditingStudent(false);
		setSelectedStudentId(0);
		setStudentForm({
			...EMPTY_STUDENT_FORM,
			classId: classFilterId || studentClasses[0]?.id || 0,
			programId: programFilterId || programs[0]?.id || 0,
		});
	};

	const handleSaveStudent = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!studentForm.classId || !studentForm.programId) {
			toast.error("Vui lòng chọn lớp sinh viên và chương trình đào tạo");
			return;
		}

		if (studentForm.studentId > 0) {
			if (!canUpdate) {
				toast.error("Bạn không có quyền cập nhật sinh viên");
				return;
			}

			updateStudentMutation.mutate(studentForm);
			return;
		}

		if (!canCreate) {
			toast.error("Bạn không có quyền tạo sinh viên");
			return;
		}

		createStudentMutation.mutate({
			studentCode: studentForm.studentCode,
			name: studentForm.name,
			dob: studentForm.dob,
			email: studentForm.email,
			phone: studentForm.phone,
			classId: studentForm.classId,
			programId: studentForm.programId,
		});
	};

	const handleDeleteStudent = () => {
		if (!selectedStudent) {
			toast.error("Vui lòng chọn sinh viên");
			return;
		}

		if (!canDelete) {
			toast.error("Bạn không có quyền xóa sinh viên");
			return;
		}

		if (!confirm(`Xóa sinh viên ${selectedStudent.name}?`)) {
			return;
		}

		deleteStudentMutation.mutate({ studentId: selectedStudent.id });
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
			const worksheet = xlsx.utils.json_to_sheet(data.rows, {
				header: STUDENT_EXCEL_HEADERS,
			});
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

		if (!file) {
			return;
		}

		try {
			const [buffer, xlsx] = await Promise.all([
				file.arrayBuffer(),
				import("xlsx"),
			]);
			const workbook = xlsx.read(buffer, { type: "array", cellDates: true });
			const firstSheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[firstSheetName];

			if (!worksheet) {
				toast.error("File Excel không có sheet dữ liệu");
				return;
			}

			const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
				defval: "",
			});
			const normalizedRows = rows.map((row) => ({
				studentCode: String(row.studentCode ?? "").trim(),
				name: String(row.name ?? "").trim(),
				dob: normalizeExcelDate(row.dob, xlsx),
				email: String(row.email ?? "").trim(),
				phone: String(row.phone ?? "").trim(),
				classCode: String(row.classCode ?? "").trim(),
				programCode: String(row.programCode ?? "").trim(),
				status:
					String(row.status ?? "active").trim() === "inactive"
						? "inactive"
						: "active",
			})) satisfies ImportStudentRow[];

			importRowsMutation.mutate({ rows: normalizedRows });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Không đọc được file Excel");
		}
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
				pageTitle="Quản lý sinh viên"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý sinh viên."
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
			pageTitle="Quản lý sinh viên"
			pageDescription="Quản lý hồ sơ sinh viên, lọc theo khoa/ngành/chương trình/lớp và import/export Excel."
		>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_460px]">
				<Card>
					<CardHeader>
						<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
							<div>
								<CardTitle>Danh sách sinh viên</CardTitle>
								<CardDescription>
									Tìm kiếm, lọc và chọn một sinh viên để xem chi tiết.
								</CardDescription>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={handleExportExcel}
									disabled={exportRowsMutation.isPending}
								>
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
											Import Excel
										</Button>
										<Button type="button" onClick={beginCreateStudent}>
											Thêm sinh viên
										</Button>
									</>
								) : null}
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="mb-4 flex flex-col gap-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="student-search">Tìm kiếm</Label>
								<Input
									id="student-search"
									value={search}
									onChange={(event) => {
										setSearch(event.target.value);
										setPage(1);
									}}
									placeholder="Nhập mã, tên, email hoặc số điện thoại..."
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

							{pagination ? (
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
											onClick={() => setPage(pagination.page - 1)}
										>
											Trước
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={!canGoNext}
											onClick={() => setPage(pagination.page + 1)}
										>
											Sau
										</Button>
									</div>
								</div>
							) : null}
						</div>

						{studentsQuery.isLoading ||
						facultiesQuery.isLoading ||
						majorsQuery.isLoading ||
						programsQuery.isLoading ||
						studentClassesQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : studentsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải danh sách sinh viên.
							</p>
						) : students.length === 0 ? (
							<div className="border border-dashed p-6 text-center text-muted-foreground text-sm">
								Không tìm thấy sinh viên phù hợp.
							</div>
						) : (
							<div className="overflow-x-auto border">
								<table className="w-full min-w-[980px] text-sm">
									<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
										<tr>
											<th className="p-3">Sinh viên</th>
											<th className="p-3">Lớp</th>
											<th className="p-3">CTĐT</th>
											<th className="p-3">Liên hệ</th>
											<th className="p-3">Trạng thái</th>
										</tr>
									</thead>
									<tbody>
										{students.map((item) => (
											<tr
												key={item.id}
												onClick={() => {
													setIsCreatingStudent(false);
													setIsEditingStudent(false);
													setSelectedStudentId(item.id);
												}}
												className={
													selectedStudentId === item.id
														? "cursor-pointer border-t bg-muted/70"
														: "cursor-pointer border-t hover:bg-muted/40"
												}
											>
												<td className="p-3">
													<div className="font-medium">{item.name}</div>
													<div className="text-muted-foreground text-xs">
														{item.studentCode} • {toDateInput(item.dob)}
													</div>
												</td>
												<td className="p-3">{getClassName(item.classId)}</td>
												<td className="p-3">{getProgramName(item.programId)}</td>
												<td className="p-3">
													<div>{item.email}</div>
													<div className="text-muted-foreground text-xs">{item.phone}</div>
												</td>
												<td className="p-3">{getStatusLabel(item.status)}</td>
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
						<CardTitle>Chi tiết sinh viên</CardTitle>
						<CardDescription>
							Xem hồ sơ sinh viên hoặc chuyển sang chế độ chỉnh sửa.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!isCreatingStudent && selectedStudentId === 0 ? (
							<div className="border border-dashed p-6 text-center text-muted-foreground text-sm">
								Chọn một sinh viên hoặc bấm “Thêm sinh viên” để bắt đầu.
							</div>
						) : selectedStudentQuery.isLoading && !isCreatingStudent ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-8 w-2/3" />
								<Skeleton className="h-20 w-full" />
							</div>
						) : selectedStudentQuery.error && !isCreatingStudent ? (
							<p className="text-destructive text-sm">
								Không thể tải chi tiết sinh viên.
							</p>
						) : isCreatingStudent || isEditingStudent ? (
							<form className="flex flex-col gap-4" onSubmit={handleSaveStudent}>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="student-code">Mã sinh viên</Label>
										<Input
											id="student-code"
											value={studentForm.studentCode}
											onChange={(event) =>
												setStudentForm((current) => ({
													...current,
													studentCode: event.target.value,
												}))
											}
											required
										/>
									</div>

									<div className="flex flex-col gap-2">
										<Label htmlFor="student-status">Trạng thái</Label>
										<select
											id="student-status"
											className="h-9 border bg-background px-3 text-sm"
											value={studentForm.status}
											onChange={(event) =>
												setStudentForm((current) => ({
													...current,
													status: event.target.value as StudentStatus,
												}))
											}
											disabled={isCreatingStudent}
										>
											<option value="active">Đang học</option>
											<option value="inactive">Ngừng học</option>
										</select>
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="student-name">Họ và tên</Label>
									<Input
										id="student-name"
										value={studentForm.name}
										onChange={(event) =>
											setStudentForm((current) => ({
												...current,
												name: event.target.value,
											}))
										}
										required
									/>
								</div>

								<div className="grid gap-3 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="student-dob">Ngày sinh</Label>
										<Input
											id="student-dob"
											type="date"
											value={studentForm.dob}
											onChange={(event) =>
												setStudentForm((current) => ({
													...current,
													dob: event.target.value,
												}))
											}
											required
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="student-phone">Số điện thoại</Label>
										<Input
											id="student-phone"
											value={studentForm.phone}
											onChange={(event) =>
												setStudentForm((current) => ({
													...current,
													phone: event.target.value,
												}))
											}
											required
										/>
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="student-email">Email</Label>
									<Input
										id="student-email"
										type="email"
										value={studentForm.email}
										onChange={(event) =>
											setStudentForm((current) => ({
												...current,
												email: event.target.value,
											}))
										}
										required
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="student-class">Lớp sinh viên</Label>
									<select
										id="student-class"
										className="h-9 border bg-background px-3 text-sm"
										value={studentForm.classId}
										onChange={(event) => {
											const classId = Number(event.target.value);
											const classItem = studentClasses.find((item) => item.id === classId);
											setStudentForm((current) => ({
												...current,
												classId,
												programId: classItem?.programId ?? current.programId,
											}));
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
										value={studentForm.programId}
										onChange={(event) =>
											setStudentForm((current) => ({
												...current,
												programId: Number(event.target.value),
											}))
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

								<div className="flex gap-2">
									<Button
										type="submit"
										disabled={
											createStudentMutation.isPending || updateStudentMutation.isPending
										}
									>
										{studentForm.studentId > 0 ? "Lưu thay đổi" : "Tạo sinh viên"}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setIsCreatingStudent(false);
											setIsEditingStudent(false);
										}}
									>
										Hủy
									</Button>
								</div>
							</form>
						) : selectedStudent ? (
							<div className="flex flex-col gap-5">
								<div className="flex items-start justify-between gap-3">
									<div>
										<h3 className="font-medium">{selectedStudent.name}</h3>
										<p className="text-muted-foreground text-sm">
											{selectedStudent.studentCode}
										</p>
									</div>
									<div className="flex gap-2">
										{canUpdate ? (
											<Button
												type="button"
												variant="outline"
												onClick={() => setIsEditingStudent(true)}
											>
												Sửa
											</Button>
										) : null}
										{canDelete ? (
											<Button
												type="button"
												variant="outline"
												disabled={deleteStudentMutation.isPending}
												onClick={handleDeleteStudent}
											>
												Xóa
											</Button>
										) : null}
									</div>
								</div>

								<div className="grid gap-3 text-sm md:grid-cols-2">
									<div>
										<p className="text-muted-foreground text-xs uppercase">Ngày sinh</p>
										<p>{toDateInput(selectedStudent.dob)}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Trạng thái</p>
										<p>{getStatusLabel(selectedStudent.status)}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Email</p>
										<p>{selectedStudent.email}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Số điện thoại</p>
										<p>{selectedStudent.phone}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Lớp</p>
										<p>
											{selectedStudent.className} ({selectedStudent.classCode})
										</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">CTĐT</p>
										<p>
											{selectedStudent.programName} ({selectedStudent.programCode})
										</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Ngành</p>
										<p>{selectedStudent.majorName}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Khoa</p>
										<p>{selectedStudent.facultyName}</p>
									</div>
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
