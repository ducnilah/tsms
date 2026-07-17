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
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

type CourseClassStatus =
	| "active"
	| "inactive"
	| "draft"
	| "scheduled"
	| "locked"
	| "cancelled";

type CourseClassItem = {
	id: number;
	semesterId: number;
	courseId: number;
	studentClassId: number;
	lecturerId: number;
	expectedStudents: number;
	weekNumbers: number[];
	status: CourseClassStatus;
	semesterName: string;
	courseCode: string;
	courseName: string;
	departmentId: number;
	departmentName: string;
	facultyId: number;
	facultyName: string;
	studentClassCode: string;
	studentClassName: string;
	lecturerName: string;
	code: string;
	name: string;
	sessionCount?: number;
};

type SemesterOption = {
	id: number;
	name: string;
	code: string;
	status: string;
};

type FacultyOption = {
	id: number;
	name: string;
	code: string;
	status: string;
};

type DepartmentOption = {
	id: number;
	facultyId: number;
	name: string;
	code: string;
	status: string;
};

type CourseOption = {
	id: number;
	departmentId: number;
	name: string;
	code: string;
	credits: number;
	status: string;
};

type StudentClassOption = {
	id: number;
	facultyId: number;
	majorId: number;
	programId: number;
	name: string;
	code: string;
	facultyName: string;
	majorName: string;
	programName: string;
};

type LecturerOption = {
	id: number;
	departmentId: number;
	name: string;
	email: string;
	position: string;
	status: string;
};

type ClassSessionItem = {
	id: number;
	scheduleDate: string;
	dayOfWeek: number;
	timeSlotName: string;
	startTime: string;
	endTime: string;
	classroomCode: string;
	sessionType: string;
	status: string;
	note: string | null;
};

type CourseClassFormState = {
	courseClassId: number;
	semesterId: number;
	facultyId: number;
	departmentId: number;
	courseId: number;
	studentClassId: number;
	lecturerId: number;
	expectedStudents: number;
	weekNumbersText: string;
	status: CourseClassStatus;
};

const EMPTY_COURSE_CLASS_FORM: CourseClassFormState = {
	courseClassId: 0,
	semesterId: 0,
	facultyId: 0,
	departmentId: 0,
	courseId: 0,
	studentClassId: 0,
	lecturerId: 0,
	expectedStudents: 60,
	weekNumbersText: "",
	status: "active",
};

const STATUS_OPTIONS: { value: CourseClassStatus; label: string }[] = [
	{ value: "draft", label: "Bản nháp" },
	{ value: "active", label: "Đang mở" },
	{ value: "scheduled", label: "Đã xếp lịch" },
	{ value: "locked", label: "Đã khóa" },
	{ value: "inactive", label: "Ngừng dùng" },
	{ value: "cancelled", label: "Đã hủy" },
];

const SESSION_TYPE_LABELS: Record<string, string> = {
	lecture: "Lý thuyết",
	lab: "Thí nghiệm",
	practice: "Thực hành",
	exam: "Thi",
};

const SESSION_STATUS_LABELS: Record<string, string> = {
	active: "Đang học",
	cancelled: "Đã hủy",
	completed: "Hoàn thành",
};

export const Route = createFileRoute("/course-classes")({
	component: CourseClassesRoute,
});

function CourseClassesRoute() {
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
	const canRead = hasPermission(permissionMap, "course-classes", "read");
	const canCreate = hasPermission(permissionMap, "course-classes", "create");
	const canUpdate = hasPermission(permissionMap, "course-classes", "update");
	const canDelete = hasPermission(permissionMap, "course-classes", "delete");
	const canReadSessions = hasPermission(permissionMap, "class-sessions", "read");

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [semesterFilterId, setSemesterFilterId] = useState(0);
	const [facultyFilterId, setFacultyFilterId] = useState(0);
	const [departmentFilterId, setDepartmentFilterId] = useState(0);
	const [lecturerFilterId, setLecturerFilterId] = useState(0);
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedCourseClassId, setSelectedCourseClassId] = useState(0);
	const [isCreatingCourseClass, setIsCreatingCourseClass] = useState(false);
	const [isEditingCourseClass, setIsEditingCourseClass] = useState(false);
	const [courseClassForm, setCourseClassForm] = useState<CourseClassFormState>(
		EMPTY_COURSE_CLASS_FORM,
	);
	const limit = 6;

	const courseClassesQuery = useQuery({
		...orpc["courseClasses.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				semesterId: semesterFilterId || undefined,
				facultyId: facultyFilterId || undefined,
				departmentId: departmentFilterId || undefined,
				lecturerId: lecturerFilterId || undefined,
				status: statusFilter ? (statusFilter as CourseClassStatus) : undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const selectedCourseClassQuery = useQuery({
		...orpc["courseClasses.byId"].queryOptions({
			input: { courseClassId: selectedCourseClassId },
		}),
		enabled: Boolean(currentUser) && canRead && selectedCourseClassId > 0,
		meta: { skipErrorToast: true },
	});

	const semestersQuery = useQuery({
		...orpc["semesters.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: true },
	});

	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: true },
	});

	const departmentsQuery = useQuery({
		...orpc["departments.options"].queryOptions({
			input: {
				facultyId:
					(isCreatingCourseClass || isEditingCourseClass
						? courseClassForm.facultyId
						: facultyFilterId) || undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: true },
	});

	const coursesQuery = useQuery({
		...orpc["courses.options"].queryOptions({
			input: {
				facultyId: courseClassForm.facultyId || facultyFilterId || undefined,
				departmentId:
					courseClassForm.departmentId || departmentFilterId || undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: true },
	});

	const lecturersQuery = useQuery({
		...orpc["lecturers.options"].queryOptions({
			input: {
				facultyId: courseClassForm.facultyId || facultyFilterId || undefined,
				departmentId:
					courseClassForm.departmentId || departmentFilterId || undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: true },
	});

	const studentClassesQuery = useQuery({
		...orpc["studentClasses.options"].queryOptions({
			input: {
				facultyId: courseClassForm.facultyId || facultyFilterId || undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: true },
	});

	const sessionsQuery = useQuery({
		...orpc["classSessions.byCourseClass"].queryOptions({
			input: { courseClassId: selectedCourseClassId },
		}),
		enabled:
			Boolean(currentUser) &&
			canRead &&
			canReadSessions &&
			selectedCourseClassId > 0,
		meta: { skipErrorToast: true },
	});

	const courseClasses = (courseClassesQuery.data?.courseClasses ??
		[]) as CourseClassItem[];
	const selectedCourseClass = selectedCourseClassQuery.data?.courseClass as
		| CourseClassItem
		| null
		| undefined;
	const semesters = (semestersQuery.data?.semesters ?? []) as SemesterOption[];
	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];
	const departments = (departmentsQuery.data?.departments ??
		[]) as DepartmentOption[];
	const courses = (coursesQuery.data?.courses ?? []) as CourseOption[];
	const lecturers = (lecturersQuery.data?.lecturers ?? []) as LecturerOption[];
	const studentClasses = (studentClassesQuery.data?.studentClasses ??
		[]) as StudentClassOption[];
	const sessions = (sessionsQuery.data?.sessions ?? []) as ClassSessionItem[];
	const pagination = courseClassesQuery.data?.pagination;

	const canGoPrevious = Boolean(pagination && pagination.page > 1);
	const canGoNext = Boolean(
		pagination &&
			pagination.totalPages > 0 &&
			pagination.page < pagination.totalPages,
	);

	const selectedRow = useMemo(
		() => courseClasses.find((item) => item.id === selectedCourseClassId),
		[courseClasses, selectedCourseClassId],
	);

	useEffect(() => {
		if (
			selectedCourseClassId > 0 &&
			!courseClasses.some((item) => item.id === selectedCourseClassId)
		) {
			setSelectedCourseClassId(0);
			setIsEditingCourseClass(false);
		}
	}, [courseClasses, selectedCourseClassId]);

	useEffect(() => {
		if (isCreatingCourseClass || !selectedCourseClass) {
			return;
		}

		setCourseClassForm({
			courseClassId: selectedCourseClass.id,
			semesterId: selectedCourseClass.semesterId,
			facultyId: selectedCourseClass.facultyId,
			departmentId: selectedCourseClass.departmentId,
			courseId: selectedCourseClass.courseId,
			studentClassId: selectedCourseClass.studentClassId,
			lecturerId: selectedCourseClass.lecturerId,
			expectedStudents: selectedCourseClass.expectedStudents,
			weekNumbersText: formatWeekNumbers(selectedCourseClass.weekNumbers),
			status: selectedCourseClass.status,
		});
	}, [isCreatingCourseClass, selectedCourseClass]);

	const invalidateCourseClassQueries = async () => {
		await queryClient.invalidateQueries();
	};

	const createCourseClassMutation = useMutation(
		orpc["courseClasses.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo lớp học phần");
				setIsCreatingCourseClass(false);
				setCourseClassForm(EMPTY_COURSE_CLASS_FORM);
				await invalidateCourseClassQueries();
			},
		}),
	);

	const updateCourseClassMutation = useMutation(
		orpc["courseClasses.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật lớp học phần");
				setIsEditingCourseClass(false);
				await invalidateCourseClassQueries();
			},
		}),
	);

	const deleteCourseClassMutation = useMutation(
		orpc["courseClasses.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa lớp học phần");
				setSelectedCourseClassId(0);
				setIsEditingCourseClass(false);
				await invalidateCourseClassQueries();
			},
		}),
	);

	const changeStatusMutation = useMutation(
		orpc["courseClasses.changeStatus"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật trạng thái lớp học phần");
				await invalidateCourseClassQueries();
			},
		}),
	);

	const handleSubmitCourseClass = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (
			!courseClassForm.semesterId ||
			!courseClassForm.courseId ||
			!courseClassForm.studentClassId ||
			!courseClassForm.lecturerId
		) {
			toast.error("Vui lòng chọn đầy đủ học kỳ, học phần, lớp sinh viên và giảng viên");
			return;
		}

		let weekNumbers: number[];

		try {
			weekNumbers = parseWeekNumbers(courseClassForm.weekNumbersText);
		} catch {
			toast.error("Tuần học không hợp lệ. Ví dụ đúng: 1-7, 9-15");
			return;
		}

		const payload = {
			semesterId: courseClassForm.semesterId,
			courseId: courseClassForm.courseId,
			studentClassId: courseClassForm.studentClassId,
			lecturerId: courseClassForm.lecturerId,
			expectedStudents: courseClassForm.expectedStudents,
			weekNumbers,
			status: courseClassForm.status,
		};

		if (courseClassForm.courseClassId > 0) {
			updateCourseClassMutation.mutate({
				courseClassId: courseClassForm.courseClassId,
				...payload,
			});
			return;
		}

		createCourseClassMutation.mutate(payload);
	};

	const handleStartCreate = () => {
		setSelectedCourseClassId(0);
		setIsEditingCourseClass(false);
		setIsCreatingCourseClass(true);
		setCourseClassForm(EMPTY_COURSE_CLASS_FORM);
	};

	const handleSelectCourseClass = (courseClassId: number) => {
		setSelectedCourseClassId(courseClassId);
		setIsCreatingCourseClass(false);
		setIsEditingCourseClass(false);
	};

	const handleStartEdit = () => {
		if (!selectedCourseClass) {
			return;
		}

		setIsCreatingCourseClass(false);
		setIsEditingCourseClass(true);
	};

	const handleCancelForm = () => {
		setIsCreatingCourseClass(false);
		setIsEditingCourseClass(false);
		if (!selectedCourseClass) {
			setCourseClassForm(EMPTY_COURSE_CLASS_FORM);
		}
	};

	const handleDeleteCourseClass = () => {
		if (!selectedCourseClass) {
			return;
		}

		deleteCourseClassMutation.mutate({
			courseClassId: selectedCourseClass.id,
		});
	};

	const handleChangeStatus = (status: CourseClassStatus) => {
		if (!selectedCourseClass) {
			return;
		}

		changeStatusMutation.mutate({
			courseClassId: selectedCourseClass.id,
			status,
		});
	};

	const handleChangeFormFaculty = (facultyId: number) => {
		setCourseClassForm((current) => ({
			...current,
			facultyId,
			departmentId: 0,
			courseId: 0,
			studentClassId: 0,
			lecturerId: 0,
		}));
	};

	const handleChangeFormDepartment = (departmentId: number) => {
		setCourseClassForm((current) => ({
			...current,
			departmentId,
			courseId: 0,
			lecturerId: 0,
		}));
	};

	const isFormOpen = isCreatingCourseClass || isEditingCourseClass;
	const deleteDisabled =
		Boolean(selectedRow?.sessionCount && selectedRow.sessionCount > 0) ||
		sessions.length > 0 ||
		deleteCourseClassMutation.isPending;

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Quản lý lớp học phần"
			pageDescription="Theo dõi học phần mở theo học kỳ, khoa, lớp sinh viên và giảng viên phụ trách."
		>
			{meQuery.isLoading ? (
				<Skeleton className="h-32 w-full" />
			) : !currentUser ? (
				<Card>
					<CardHeader>
						<CardTitle>Chưa đăng nhập</CardTitle>
						<CardDescription>
							Vui lòng đăng nhập để quản lý lớp học phần.
						</CardDescription>
					</CardHeader>
				</Card>
			) : !canRead ? (
				<Card>
					<CardHeader>
						<CardTitle>Không có quyền truy cập</CardTitle>
						<CardDescription>
							Tài khoản hiện tại chưa được cấp quyền xem lớp học phần.
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<>
					<Card>
						<CardHeader>
							<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
								<div>
									<CardTitle>Danh sách lớp học phần</CardTitle>
									<CardDescription>
										Tìm kiếm theo mã học phần, tên học phần, lớp sinh viên hoặc giảng viên.
									</CardDescription>
								</div>
								{canCreate ? (
									<Button type="button" onClick={handleStartCreate}>
										Thêm lớp học phần
									</Button>
								) : null}
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
								<div className="space-y-2">
									<Label htmlFor="search">Tìm kiếm</Label>
									<Input
										id="search"
										value={search}
										placeholder="Nhập mã/tên học phần, lớp, giảng viên"
										onChange={(event) => {
											setSearch(event.target.value);
											setPage(1);
										}}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="semesterFilter">Học kỳ</Label>
									<select
										id="semesterFilter"
										className="h-10 w-full border bg-background px-3 text-sm"
										value={semesterFilterId}
										onChange={(event) => {
											setSemesterFilterId(Number(event.target.value));
											setPage(1);
										}}
									>
										<option value={0}>Tất cả học kỳ</option>
										{semesters.map((item) => (
											<option key={item.id} value={item.id}>
												{item.name}
											</option>
										))}
									</select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="facultyFilter">Khoa</Label>
									<select
										id="facultyFilter"
										className="h-10 w-full border bg-background px-3 text-sm"
										value={facultyFilterId}
										onChange={(event) => {
											setFacultyFilterId(Number(event.target.value));
											setDepartmentFilterId(0);
											setLecturerFilterId(0);
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
								<div className="space-y-2">
									<Label htmlFor="departmentFilter">Bộ môn</Label>
									<select
										id="departmentFilter"
										className="h-10 w-full border bg-background px-3 text-sm"
										value={departmentFilterId}
										onChange={(event) => {
											setDepartmentFilterId(Number(event.target.value));
											setLecturerFilterId(0);
											setPage(1);
										}}
									>
										<option value={0}>Tất cả bộ môn</option>
										{departments.map((item) => (
											<option key={item.id} value={item.id}>
												{item.name}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="grid gap-3 md:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="lecturerFilter">Giảng viên</Label>
									<select
										id="lecturerFilter"
										className="h-10 w-full border bg-background px-3 text-sm"
										value={lecturerFilterId}
										onChange={(event) => {
											setLecturerFilterId(Number(event.target.value));
											setPage(1);
										}}
									>
										<option value={0}>Tất cả giảng viên</option>
										{lecturers.map((item) => (
											<option key={item.id} value={item.id}>
												{item.name}
											</option>
										))}
									</select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="statusFilter">Trạng thái</Label>
									<select
										id="statusFilter"
										className="h-10 w-full border bg-background px-3 text-sm"
										value={statusFilter}
										onChange={(event) => {
											setStatusFilter(event.target.value);
											setPage(1);
										}}
									>
										<option value="">Tất cả trạng thái</option>
										{STATUS_OPTIONS.map((item) => (
											<option key={item.value} value={item.value}>
												{item.label}
											</option>
										))}
									</select>
								</div>
								<div className="flex items-end justify-between gap-3">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setSearch("");
											setSemesterFilterId(0);
											setFacultyFilterId(0);
											setDepartmentFilterId(0);
											setLecturerFilterId(0);
											setStatusFilter("");
											setPage(1);
										}}
									>
										Xóa lọc
									</Button>
									<p className="text-muted-foreground text-sm">
										{pagination?.total ?? 0} lớp học phần
									</p>
								</div>
							</div>

							<div className="overflow-x-auto border">
								<table className="w-full min-w-[1100px] border-collapse text-sm">
									<thead className="bg-muted text-left">
										<tr>
											<th className="border-b px-3 py-2 font-medium">Mã lớp</th>
											<th className="border-b px-3 py-2 font-medium">Học phần</th>
											<th className="border-b px-3 py-2 font-medium">Khoa/Bộ môn</th>
											<th className="border-b px-3 py-2 font-medium">Lớp sinh viên</th>
											<th className="border-b px-3 py-2 font-medium">Giảng viên</th>
											<th className="border-b px-3 py-2 font-medium">Tuần học</th>
											<th className="border-b px-3 py-2 font-medium">Sĩ số</th>
											<th className="border-b px-3 py-2 font-medium">Trạng thái</th>
										</tr>
									</thead>
									<tbody>
										{courseClassesQuery.isLoading ? (
											<tr>
												<td colSpan={8} className="px-3 py-6">
													<Skeleton className="h-10 w-full" />
												</td>
											</tr>
										) : courseClasses.length === 0 ? (
											<tr>
												<td
													colSpan={8}
													className="px-3 py-6 text-center text-muted-foreground"
												>
													Chưa có lớp học phần phù hợp.
												</td>
											</tr>
										) : (
											courseClasses.map((item) => (
												<tr
													key={item.id}
													className={`cursor-pointer transition-colors hover:bg-muted/60 ${
														selectedCourseClassId === item.id ? "bg-muted" : ""
													}`}
													onClick={() => handleSelectCourseClass(item.id)}
												>
													<td className="border-t px-3 py-2 font-medium">
														{item.code}
													</td>
													<td className="border-t px-3 py-2">
														<div>{item.courseName}</div>
														<div className="text-muted-foreground text-xs">
															{item.courseCode} · {item.semesterName}
														</div>
													</td>
													<td className="border-t px-3 py-2">
														<div>{item.facultyName}</div>
														<div className="text-muted-foreground text-xs">
															{item.departmentName}
														</div>
													</td>
													<td className="border-t px-3 py-2">
														<div>{item.studentClassName}</div>
														<div className="text-muted-foreground text-xs">
															{item.studentClassCode}
														</div>
													</td>
													<td className="border-t px-3 py-2">{item.lecturerName}</td>
													<td className="border-t px-3 py-2">
														{formatWeekNumbers(item.weekNumbers)}
													</td>
													<td className="border-t px-3 py-2">
														{item.expectedStudents}
														<div className="text-muted-foreground text-xs">
															{item.sessionCount ?? 0} buổi học
														</div>
													</td>
													<td className="border-t px-3 py-2">
														{getStatusLabel(item.status)}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>

							<div className="flex flex-col gap-2 text-muted-foreground text-sm md:flex-row md:items-center md:justify-between">
								<p>
									Trang {pagination?.page ?? page} /{" "}
									{pagination?.totalPages ?? 1}
								</p>
								<div className="flex gap-2">
									<Button
										type="button"
										variant="outline"
										disabled={!canGoPrevious}
										onClick={() => setPage((current) => Math.max(1, current - 1))}
									>
										Trước
									</Button>
									<Button
										type="button"
										variant="outline"
										disabled={!canGoNext}
										onClick={() => setPage((current) => current + 1)}
									>
										Sau
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
						<Card>
							<CardHeader>
								<CardTitle>
									{isFormOpen
										? courseClassForm.courseClassId > 0
											? "Cập nhật lớp học phần"
											: "Tạo lớp học phần"
										: "Chi tiết lớp học phần"}
								</CardTitle>
								<CardDescription>
									{isFormOpen
										? "Chọn học kỳ, học phần, lớp sinh viên và giảng viên phụ trách."
										: "Chọn một dòng trong bảng để xem chi tiết trước khi chỉnh sửa."}
								</CardDescription>
							</CardHeader>
							<CardContent>
								{isFormOpen ? (
									<form className="space-y-4" onSubmit={handleSubmitCourseClass}>
										<div className="grid gap-3 md:grid-cols-2">
											<div className="space-y-2">
												<Label htmlFor="semesterId">Học kỳ</Label>
												<select
													id="semesterId"
													className="h-10 w-full border bg-background px-3 text-sm"
													value={courseClassForm.semesterId}
													onChange={(event) =>
														setCourseClassForm((current) => ({
															...current,
															semesterId: Number(event.target.value),
														}))
													}
													required
												>
													<option value={0}>Chọn học kỳ</option>
													{semesters.map((item) => (
														<option key={item.id} value={item.id}>
															{item.name}
														</option>
													))}
												</select>
											</div>
											<div className="space-y-2">
												<Label htmlFor="formFacultyId">Khoa</Label>
												<select
													id="formFacultyId"
													className="h-10 w-full border bg-background px-3 text-sm"
													value={courseClassForm.facultyId}
													onChange={(event) =>
														handleChangeFormFaculty(Number(event.target.value))
													}
													required
												>
													<option value={0}>Chọn khoa</option>
													{faculties.map((item) => (
														<option key={item.id} value={item.id}>
															{item.name}
														</option>
													))}
												</select>
											</div>
											<div className="space-y-2">
												<Label htmlFor="formDepartmentId">Bộ môn</Label>
												<select
													id="formDepartmentId"
													className="h-10 w-full border bg-background px-3 text-sm"
													value={courseClassForm.departmentId}
													onChange={(event) =>
														handleChangeFormDepartment(Number(event.target.value))
													}
													required
												>
													<option value={0}>Chọn bộ môn</option>
													{departments.map((item) => (
														<option key={item.id} value={item.id}>
															{item.name}
														</option>
													))}
												</select>
											</div>
											<div className="space-y-2">
												<Label htmlFor="courseId">Học phần</Label>
												<select
													id="courseId"
													className="h-10 w-full border bg-background px-3 text-sm"
													value={courseClassForm.courseId}
													onChange={(event) =>
														setCourseClassForm((current) => ({
															...current,
															courseId: Number(event.target.value),
														}))
													}
													required
												>
													<option value={0}>Chọn học phần</option>
													{courses.map((item) => (
														<option key={item.id} value={item.id}>
															{item.code} - {item.name}
														</option>
													))}
												</select>
											</div>
											<div className="space-y-2">
												<Label htmlFor="studentClassId">Lớp sinh viên</Label>
												<select
													id="studentClassId"
													className="h-10 w-full border bg-background px-3 text-sm"
													value={courseClassForm.studentClassId}
													onChange={(event) =>
														setCourseClassForm((current) => ({
															...current,
															studentClassId: Number(event.target.value),
														}))
													}
													required
												>
													<option value={0}>Chọn lớp sinh viên</option>
													{studentClasses.map((item) => (
														<option key={item.id} value={item.id}>
															{item.code} - {item.name}
														</option>
													))}
												</select>
											</div>
											<div className="space-y-2">
												<Label htmlFor="lecturerId">Giảng viên</Label>
												<select
													id="lecturerId"
													className="h-10 w-full border bg-background px-3 text-sm"
													value={courseClassForm.lecturerId}
													onChange={(event) =>
														setCourseClassForm((current) => ({
															...current,
															lecturerId: Number(event.target.value),
														}))
													}
													required
												>
													<option value={0}>Chọn giảng viên</option>
													{lecturers.map((item) => (
														<option key={item.id} value={item.id}>
															{item.name}
														</option>
													))}
												</select>
											</div>
											<div className="space-y-2">
												<Label htmlFor="expectedStudents">Sĩ số dự kiến</Label>
												<Input
													id="expectedStudents"
													type="number"
													min={0}
													value={courseClassForm.expectedStudents}
													onChange={(event) =>
														setCourseClassForm((current) => ({
															...current,
															expectedStudents: Number(event.target.value),
														}))
													}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="status">Trạng thái</Label>
												<select
													id="status"
													className="h-10 w-full border bg-background px-3 text-sm"
													value={courseClassForm.status}
													onChange={(event) =>
														setCourseClassForm((current) => ({
															...current,
															status: event.target.value as CourseClassStatus,
														}))
													}
												>
													{STATUS_OPTIONS.map((item) => (
														<option key={item.value} value={item.value}>
															{item.label}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor="weekNumbers">Tuần học</Label>
											<Input
												id="weekNumbers"
												value={courseClassForm.weekNumbersText}
												placeholder="Ví dụ: 1-7, 9-15 hoặc 1,2,3,4"
												onChange={(event) =>
													setCourseClassForm((current) => ({
														...current,
														weekNumbersText: event.target.value,
													}))
												}
											/>
											<p className="text-muted-foreground text-xs">
												Lưu các tuần học thực tế để sau này sinh buổi học theo lịch thủ công.
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												type="submit"
												disabled={
													createCourseClassMutation.isPending ||
													updateCourseClassMutation.isPending
												}
											>
												{courseClassForm.courseClassId > 0 ? "Lưu thay đổi" : "Tạo lớp"}
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={handleCancelForm}
											>
												Hủy
											</Button>
										</div>
									</form>
								) : selectedCourseClassQuery.isLoading ? (
									<Skeleton className="h-40 w-full" />
								) : selectedCourseClass ? (
									<div className="space-y-4">
										<div className="grid gap-3 md:grid-cols-2">
											<InfoItem label="Mã lớp" value={selectedCourseClass.code} />
											<InfoItem
												label="Trạng thái"
												value={getStatusLabel(selectedCourseClass.status)}
											/>
											<InfoItem
												label="Học kỳ"
												value={selectedCourseClass.semesterName}
											/>
											<InfoItem
												label="Học phần"
												value={`${selectedCourseClass.courseCode} - ${selectedCourseClass.courseName}`}
											/>
											<InfoItem
												label="Khoa"
												value={selectedCourseClass.facultyName}
											/>
											<InfoItem
												label="Bộ môn"
												value={selectedCourseClass.departmentName}
											/>
											<InfoItem
												label="Lớp sinh viên"
												value={`${selectedCourseClass.studentClassCode} - ${selectedCourseClass.studentClassName}`}
											/>
											<InfoItem
												label="Giảng viên"
												value={selectedCourseClass.lecturerName}
											/>
											<InfoItem
												label="Sĩ số dự kiến"
												value={String(selectedCourseClass.expectedStudents)}
											/>
											<InfoItem
												label="Tuần học"
												value={formatWeekNumbers(selectedCourseClass.weekNumbers)}
											/>
										</div>
										<div className="flex flex-wrap gap-2">
											{canUpdate ? (
												<Button type="button" onClick={handleStartEdit}>
													Sửa
												</Button>
											) : null}
											{canUpdate ? (
												<select
													className="h-10 border bg-background px-3 text-sm"
													value={selectedCourseClass.status}
													disabled={changeStatusMutation.isPending}
													onChange={(event) =>
														handleChangeStatus(event.target.value as CourseClassStatus)
													}
												>
													{STATUS_OPTIONS.map((item) => (
														<option key={item.value} value={item.value}>
															{item.label}
														</option>
													))}
												</select>
											) : null}
											{canDelete ? (
												<Button
													type="button"
													variant="destructive"
													disabled={deleteDisabled}
													onClick={handleDeleteCourseClass}
												>
													Xóa
												</Button>
											) : null}
										</div>
										{deleteDisabled && canDelete ? (
											<p className="text-muted-foreground text-sm">
												Không thể xóa lớp học phần đã có buổi học.
											</p>
										) : null}
									</div>
								) : (
									<p className="text-muted-foreground text-sm">
										Chọn một lớp học phần để xem chi tiết. Màn này không tự chọn dòng đầu tiên để tránh sửa nhầm dữ liệu.
									</p>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Buổi học của lớp</CardTitle>
								<CardDescription>
									Hiển thị nhanh các buổi đã được xếp lịch cho lớp học phần đang chọn.
								</CardDescription>
							</CardHeader>
							<CardContent>
								{!selectedCourseClassId ? (
									<p className="text-muted-foreground text-sm">
										Chọn một lớp học phần để xem các buổi học.
									</p>
								) : !canReadSessions ? (
									<p className="text-muted-foreground text-sm">
										Tài khoản chưa có quyền xem buổi học.
									</p>
								) : sessionsQuery.isLoading ? (
									<Skeleton className="h-28 w-full" />
								) : sessions.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										Lớp học phần này chưa có buổi học nào.
									</p>
								) : (
									<div className="space-y-3">
										{sessions.map((item) => (
											<div key={item.id} className="border p-3">
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="font-medium text-sm">
															{getDayLabel(item.dayOfWeek)}, {item.scheduleDate}
														</p>
														<p className="text-muted-foreground text-xs">
															{item.timeSlotName} · {item.startTime} - {item.endTime}
														</p>
													</div>
													<span className="border px-2 py-1 text-xs">
														{SESSION_STATUS_LABELS[item.status] ?? item.status}
													</span>
												</div>
												<div className="mt-2 text-sm">
													Phòng {item.classroomCode} ·{" "}
													{SESSION_TYPE_LABELS[item.sessionType] ?? item.sessionType}
												</div>
												{item.note ? (
													<p className="mt-1 text-muted-foreground text-xs">
														{item.note}
													</p>
												) : null}
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</>
			)}
		</AppShell>
	);
}

function InfoItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="border p-3">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="mt-1 font-medium text-sm">{value || "Không xác định"}</p>
		</div>
	);
}

function getStatusLabel(status: CourseClassStatus) {
	return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function getDayLabel(dayOfWeek: number) {
	const labels: Record<number, string> = {
		1: "Thứ 2",
		2: "Thứ 3",
		3: "Thứ 4",
		4: "Thứ 5",
		5: "Thứ 6",
		6: "Thứ 7",
		7: "Chủ nhật",
	};

	return labels[dayOfWeek] ?? `Ngày ${dayOfWeek}`;
}

function parseWeekNumbers(value: string) {
	const weekNumbers = new Set<number>();

	for (const segment of value.split(",")) {
		const trimmedSegment = segment.trim();

		if (!trimmedSegment) {
			continue;
		}

		const [startText, endText] = trimmedSegment.split("-").map((item) => item.trim());
		const startWeek = Number(startText);
		const endWeek = endText ? Number(endText) : startWeek;

		if (
			!Number.isInteger(startWeek) ||
			!Number.isInteger(endWeek) ||
			startWeek <= 0 ||
			endWeek < startWeek
		) {
			throw new Error("INVALID_WEEK_NUMBERS");
		}

		for (let weekNumber = startWeek; weekNumber <= endWeek; weekNumber += 1) {
			weekNumbers.add(weekNumber);
		}
	}

	return [...weekNumbers].sort((first, second) => first - second);
}

function formatWeekNumbers(weekNumbers: number[] | null | undefined) {
	if (!weekNumbers || weekNumbers.length === 0) {
		return "Chưa cấu hình";
	}

	const sortedWeekNumbers = [...weekNumbers].sort((first, second) => first - second);
	const ranges: string[] = [];
	let startWeek = sortedWeekNumbers[0];
	let previousWeek = sortedWeekNumbers[0];

	for (const currentWeek of sortedWeekNumbers.slice(1)) {
		if (currentWeek === previousWeek + 1) {
			previousWeek = currentWeek;
			continue;
		}

		ranges.push(startWeek === previousWeek ? String(startWeek) : `${startWeek}-${previousWeek}`);
		startWeek = currentWeek;
		previousWeek = currentWeek;
	}

	ranges.push(startWeek === previousWeek ? String(startWeek) : `${startWeek}-${previousWeek}`);

	return ranges.join(", ");
}
