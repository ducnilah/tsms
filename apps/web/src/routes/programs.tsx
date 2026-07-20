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
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

type ProgramStatus = "active" | "inactive";

type ProgramItem = {
	id: number;
	majorId: number;
	code: string;
	name: string;
	academicYear: string;
	version: number;
	totalCredits: number;
	status: ProgramStatus;
};

type ProgramDetail = ProgramItem & {
	majorName: string;
	majorCode: string;
	courseCount: number;
	studentClassCount: number;
	studentCount: number;
};

type MajorOption = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	status: ProgramStatus;
};

type CourseOption = {
	id: number;
	departmentId: number;
	code: string;
	name: string;
	lectureCredits: number;
	practiceCredits: number;
	status: ProgramStatus;
};

type ProgramCourseItem = {
	id: number;
	programId: number;
	courseId: number;
	semesterNo: number;
	isRequired: number;
	courseCode: string;
	courseName: string;
	lectureCredits: number;
	practiceCredits: number;
	departmentId: number;
};

type ProgramFormState = {
	programId: number;
	majorId: number;
	code: string;
	name: string;
	academicYear: string;
	version: number;
	totalCredits: number;
	status: ProgramStatus;
};

type ProgramCourseFormState = {
	programCourseId: number;
	courseId: number;
	semesterNo: number;
	isRequired: number;
};

const EMPTY_PROGRAM_FORM: ProgramFormState = {
	programId: 0,
	majorId: 0,
	code: "",
	name: "",
	academicYear: "",
	version: 1,
	totalCredits: 132,
	status: "active",
};

const EMPTY_PROGRAM_COURSE_FORM: ProgramCourseFormState = {
	programCourseId: 0,
	courseId: 0,
	semesterNo: 1,
	isRequired: 1,
};

export const Route = createFileRoute("/programs")({
	validateSearch: (search: Record<string, unknown>) => {
		const majorId = Number(search.majorId);

		return {
			majorId: Number.isInteger(majorId) && majorId > 0 ? majorId : undefined,
		};
	},
	component: ProgramsRoute,
});

function ProgramsRoute() {
	const navigate = useNavigate();
	const searchParams = Route.useSearch();

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
	const canRead = hasPermission(permissionMap, "programs", "read");
	const canCreate = hasPermission(permissionMap, "programs", "create");
	const canUpdate = hasPermission(permissionMap, "programs", "update");
	const canDelete = hasPermission(permissionMap, "programs", "delete");
	const canReadCourses = hasPermission(permissionMap, "courses", "read");

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [majorFilterId, setMajorFilterId] = useState(searchParams.majorId ?? 0);
	const [academicYearFilter, setAcademicYearFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [selectedProgramId, setSelectedProgramId] = useState(0);
	const [isCreatingProgram, setIsCreatingProgram] = useState(false);
	const [isEditingProgram, setIsEditingProgram] = useState(false);
	const [programForm, setProgramForm] =
		useState<ProgramFormState>(EMPTY_PROGRAM_FORM);
	const [programCourseForm, setProgramCourseForm] =
		useState<ProgramCourseFormState>(EMPTY_PROGRAM_COURSE_FORM);
	const limit = 6;

	useEffect(() => {
		setMajorFilterId(searchParams.majorId ?? 0);
		setPage(1);
	}, [searchParams.majorId]);

	const programsQuery = useQuery({
		...orpc["programs.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				majorId: majorFilterId || undefined,
				academicYear: academicYearFilter.trim() || undefined,
				status: statusFilter ? (statusFilter as ProgramStatus) : undefined,
			},
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const majorsQuery = useQuery({
		...orpc["majors.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const selectedProgramQuery = useQuery({
		...orpc["programs.byId"].queryOptions({
			input: { programId: selectedProgramId },
		}),
		enabled: Boolean(currentUser) && canRead && selectedProgramId > 0,
		meta: { skipErrorToast: true },
	});

	const programCoursesQuery = useQuery({
		...orpc["programCourses.listByProgram"].queryOptions({
			input: { programId: selectedProgramId },
		}),
		enabled: Boolean(currentUser) && canRead && selectedProgramId > 0,
		meta: { skipErrorToast: true },
	});

	const coursesQuery = useQuery({
		...orpc["courses.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead && canReadCourses,
		meta: { skipErrorToast: !canReadCourses },
	});

	const programs = (programsQuery.data?.programs ?? []) as ProgramItem[];
	const majors = (majorsQuery.data?.majors ?? []) as MajorOption[];
	const selectedProgram = selectedProgramQuery.data?.program as
		| ProgramDetail
		| undefined;
	const programCourses = (programCoursesQuery.data?.programCourses ??
		[]) as ProgramCourseItem[];
	const courses = (coursesQuery.data?.courses ?? []) as CourseOption[];
	const pagination = programsQuery.data?.pagination;

	const canGoPrevious = Boolean(pagination && pagination.page > 1);
	const canGoNext = Boolean(
		pagination &&
			pagination.totalPages > 0 &&
			pagination.page < pagination.totalPages,
	);

	const getMajorName = (majorId: number) =>
		majors.find((item) => item.id === majorId)?.name ?? "Không xác định";

	const getStatusLabel = (status: ProgramStatus) =>
		status === "active" ? "Đang hoạt động" : "Ngừng hoạt động";

	useEffect(() => {
		if (
			selectedProgramId > 0 &&
			!programs.some((item) => item.id === selectedProgramId)
		) {
			setSelectedProgramId(0);
			setIsEditingProgram(false);
		}
	}, [programs, selectedProgramId]);

	useEffect(() => {
		if (isCreatingProgram || !selectedProgram) {
			return;
		}

		setProgramForm({
			programId: selectedProgram.id,
			majorId: selectedProgram.majorId,
			code: selectedProgram.code,
			name: selectedProgram.name,
			academicYear: selectedProgram.academicYear,
			version: selectedProgram.version,
			totalCredits: selectedProgram.totalCredits,
			status: selectedProgram.status,
		});
	}, [isCreatingProgram, selectedProgram]);

	useEffect(() => {
		setProgramCourseForm({
			...EMPTY_PROGRAM_COURSE_FORM,
			courseId: courses[0]?.id ?? 0,
		});
	}, [courses, selectedProgramId]);

	const invalidateProgramQueries = async () => {
		await queryClient.invalidateQueries();
	};

	const createProgramMutation = useMutation(
		orpc["programs.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo chương trình đào tạo");
				setIsCreatingProgram(false);
				setIsEditingProgram(false);
				setSelectedProgramId(data.program.id);
				await invalidateProgramQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateProgramMutation = useMutation(
		orpc["programs.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật chương trình đào tạo");
				setIsCreatingProgram(false);
				setIsEditingProgram(false);
				setSelectedProgramId(data.program.id);
				await invalidateProgramQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteProgramMutation = useMutation(
		orpc["programs.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa chương trình đào tạo");
				setIsCreatingProgram(false);
				setIsEditingProgram(false);
				setSelectedProgramId(0);
				setProgramForm(EMPTY_PROGRAM_FORM);
				await invalidateProgramQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const createProgramCourseMutation = useMutation(
		orpc["programCourses.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã thêm học phần vào chương trình");
				setProgramCourseForm({
					...EMPTY_PROGRAM_COURSE_FORM,
					courseId: courses[0]?.id ?? 0,
				});
				await invalidateProgramQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteProgramCourseMutation = useMutation(
		orpc["programCourses.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã bỏ học phần khỏi chương trình");
				await invalidateProgramQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const beginCreateProgram = () => {
		setIsCreatingProgram(true);
		setIsEditingProgram(false);
		setSelectedProgramId(0);
		setProgramForm({
			...EMPTY_PROGRAM_FORM,
			majorId: majorFilterId || majors[0]?.id || 0,
			academicYear: new Date().getFullYear().toString(),
		});
	};

	const handleSaveProgram = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!programForm.majorId) {
			toast.error("Vui lòng chọn ngành quản lý");
			return;
		}

		if (programForm.programId > 0) {
			if (!canUpdate) {
				toast.error("Bạn không có quyền cập nhật chương trình đào tạo");
				return;
			}

			updateProgramMutation.mutate(programForm);
			return;
		}

		if (!canCreate) {
			toast.error("Bạn không có quyền tạo chương trình đào tạo");
			return;
		}

		createProgramMutation.mutate({
			majorId: programForm.majorId,
			code: programForm.code,
			name: programForm.name,
			academicYear: programForm.academicYear,
			version: programForm.version,
			totalCredits: programForm.totalCredits,
		});
	};

	const handleDeleteProgram = () => {
		if (!selectedProgram) {
			toast.error("Vui lòng chọn chương trình đào tạo");
			return;
		}

		if (!canDelete) {
			toast.error("Bạn không có quyền xóa chương trình đào tạo");
			return;
		}

		if (
			selectedProgram.courseCount > 0 ||
			selectedProgram.studentClassCount > 0 ||
			selectedProgram.studentCount > 0
		) {
			toast.error(
				"Không thể xóa chương trình khi vẫn còn học phần, lớp hoặc sinh viên liên kết",
			);
			return;
		}

		if (!confirm(`Xóa chương trình ${selectedProgram.name}?`)) {
			return;
		}

		deleteProgramMutation.mutate({ programId: selectedProgram.id });
	};

	const handleAddProgramCourse = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!selectedProgram) {
			toast.error("Vui lòng chọn chương trình đào tạo");
			return;
		}

		if (!canUpdate) {
			toast.error("Bạn không có quyền cập nhật chương trình đào tạo");
			return;
		}

		if (!programCourseForm.courseId) {
			toast.error("Vui lòng chọn học phần");
			return;
		}

		createProgramCourseMutation.mutate({
			programId: selectedProgram.id,
			courseId: programCourseForm.courseId,
			semesterNo: programCourseForm.semesterNo,
			isRequired: programCourseForm.isRequired,
		});
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
				pageTitle="Quản lý chương trình đào tạo"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý chương trình đào tạo."
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
			pageTitle="Quản lý chương trình đào tạo"
			pageDescription="Quản lý chương trình theo ngành, khóa học và danh sách học phần trong chương trình."
		>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_460px]">
				<Card>
					<CardHeader>
						<div className="flex items-start justify-between gap-3">
							<div>
								<CardTitle>Danh sách chương trình</CardTitle>
								<CardDescription>
									Tìm kiếm, lọc theo ngành và chọn chương trình để xem chi tiết.
								</CardDescription>
							</div>

							{canCreate ? (
								<Button type="button" variant="outline" onClick={beginCreateProgram}>
									Thêm chương trình
								</Button>
							) : null}
						</div>
					</CardHeader>
					<CardContent>
						<div className="mb-4 flex flex-col gap-3">
							<div className="flex flex-col gap-2">
								<Label htmlFor="program-search">Tìm kiếm</Label>
								<Input
									id="program-search"
									value={search}
									onChange={(event) => {
										setSearch(event.target.value);
										setPage(1);
									}}
									placeholder="Nhập mã hoặc tên chương trình..."
								/>
							</div>

							<div className="grid gap-3 md:grid-cols-3">
								<div className="flex flex-col gap-2">
									<Label htmlFor="program-filter-major">Ngành</Label>
									<select
										id="program-filter-major"
										className="h-9 border bg-background px-3 text-sm"
										value={majorFilterId}
										onChange={(event) => {
											setMajorFilterId(Number(event.target.value));
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
									<Label htmlFor="program-filter-year">Khóa học</Label>
									<Input
										id="program-filter-year"
										value={academicYearFilter}
										onChange={(event) => {
											setAcademicYearFilter(event.target.value);
											setPage(1);
										}}
										placeholder="VD: 2024"
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="program-filter-status">Trạng thái</Label>
									<select
										id="program-filter-status"
										className="h-9 border bg-background px-3 text-sm"
										value={statusFilter}
										onChange={(event) => {
											setStatusFilter(event.target.value);
											setPage(1);
										}}
									>
										<option value="">Tất cả trạng thái</option>
										<option value="active">Đang hoạt động</option>
										<option value="inactive">Ngừng hoạt động</option>
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

						{programsQuery.isLoading || majorsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : programsQuery.error || majorsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải danh sách chương trình đào tạo.
							</p>
						) : programs.length === 0 ? (
							<div className="border border-dashed p-6 text-center text-muted-foreground text-sm">
								Không tìm thấy chương trình đào tạo phù hợp.
							</div>
						) : (
							<div className="overflow-x-auto border">
								<table className="w-full min-w-[880px] text-sm">
									<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
										<tr>
											<th className="p-3">Chương trình</th>
											<th className="p-3">Ngành</th>
											<th className="p-3">Khóa</th>
											<th className="p-3">Tín chỉ</th>
											<th className="p-3">Trạng thái</th>
										</tr>
									</thead>
									<tbody>
										{programs.map((item) => (
											<tr
												key={item.id}
												onClick={() => {
													setIsCreatingProgram(false);
													setIsEditingProgram(false);
													setSelectedProgramId(item.id);
												}}
												className={
													selectedProgramId === item.id
														? "cursor-pointer border-t bg-muted/70"
														: "cursor-pointer border-t hover:bg-muted/40"
												}
											>
												<td className="p-3">
													<div className="font-medium">{item.name}</div>
													<div className="text-muted-foreground text-xs">
														{item.code} • Phiên bản {item.version}
													</div>
												</td>
												<td className="p-3">{getMajorName(item.majorId)}</td>
												<td className="p-3">{item.academicYear}</td>
												<td className="p-3">{item.totalCredits}</td>
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
						<CardTitle>Chi tiết chương trình</CardTitle>
						<CardDescription>
							Xem thông tin, chỉnh sửa chương trình và quản lý học phần.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!isCreatingProgram && selectedProgramId === 0 ? (
							<div className="border border-dashed p-6 text-center text-muted-foreground text-sm">
								Chọn một chương trình hoặc bấm “Thêm chương trình” để bắt đầu.
							</div>
						) : selectedProgramQuery.isLoading && !isCreatingProgram ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-8 w-2/3" />
								<Skeleton className="h-20 w-full" />
								<Skeleton className="h-28 w-full" />
							</div>
						) : selectedProgramQuery.error && !isCreatingProgram ? (
							<p className="text-destructive text-sm">
								Không thể tải chi tiết chương trình đào tạo.
							</p>
						) : isCreatingProgram || isEditingProgram ? (
							<form className="flex flex-col gap-4" onSubmit={handleSaveProgram}>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="program-code">Mã chương trình</Label>
										<Input
											id="program-code"
											value={programForm.code}
											onChange={(event) =>
												setProgramForm((current) => ({
													...current,
													code: event.target.value,
												}))
											}
											placeholder="VD: IT1"
											required
										/>
									</div>

									<div className="flex flex-col gap-2">
										<Label htmlFor="program-status">Trạng thái</Label>
										<select
											id="program-status"
											className="h-9 border bg-background px-3 text-sm"
											value={programForm.status}
											onChange={(event) =>
												setProgramForm((current) => ({
													...current,
													status: event.target.value as ProgramStatus,
												}))
											}
											disabled={isCreatingProgram}
										>
											<option value="active">Đang hoạt động</option>
											<option value="inactive">Ngừng hoạt động</option>
										</select>
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="program-name">Tên chương trình</Label>
									<Input
										id="program-name"
										value={programForm.name}
										onChange={(event) =>
											setProgramForm((current) => ({
												...current,
												name: event.target.value,
											}))
										}
										placeholder="VD: CNTT: Khoa học Máy tính"
										required
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="program-major">Ngành</Label>
									<select
										id="program-major"
										className="h-9 border bg-background px-3 text-sm"
										value={programForm.majorId}
										onChange={(event) =>
											setProgramForm((current) => ({
												...current,
												majorId: Number(event.target.value),
											}))
										}
										required
									>
										<option value={0}>Chọn ngành</option>
										{majors.map((item) => (
											<option key={item.id} value={item.id}>
												{item.name}
											</option>
										))}
									</select>
								</div>

								<div className="grid gap-3 md:grid-cols-3">
									<div className="flex flex-col gap-2">
										<Label htmlFor="program-year">Khóa học</Label>
										<Input
											id="program-year"
											value={programForm.academicYear}
											onChange={(event) =>
												setProgramForm((current) => ({
													...current,
													academicYear: event.target.value,
												}))
											}
											placeholder="VD: 2024"
											required
										/>
									</div>

									<div className="flex flex-col gap-2">
										<Label htmlFor="program-version">Phiên bản</Label>
										<Input
											id="program-version"
											type="number"
											min={1}
											value={programForm.version}
											onChange={(event) =>
												setProgramForm((current) => ({
													...current,
													version: Number(event.target.value),
												}))
											}
											required
										/>
									</div>

									<div className="flex flex-col gap-2">
										<Label htmlFor="program-credits">Tổng tín chỉ</Label>
										<Input
											id="program-credits"
											type="number"
											min={1}
											value={programForm.totalCredits}
											onChange={(event) =>
												setProgramForm((current) => ({
													...current,
													totalCredits: Number(event.target.value),
												}))
											}
											required
										/>
									</div>
								</div>

								<div className="flex gap-2">
									<Button
										type="submit"
										disabled={
											createProgramMutation.isPending ||
											updateProgramMutation.isPending
										}
									>
										{programForm.programId > 0
											? "Lưu thay đổi"
											: "Tạo chương trình"}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setIsCreatingProgram(false);
											setIsEditingProgram(false);
										}}
									>
										Hủy
									</Button>
								</div>
							</form>
						) : selectedProgram ? (
							<div className="flex flex-col gap-5">
								<div className="flex items-start justify-between gap-3">
									<div>
										<h3 className="font-medium">{selectedProgram.name}</h3>
										<p className="text-muted-foreground text-sm">
											{selectedProgram.code} • Phiên bản {selectedProgram.version}
										</p>
									</div>

									<div className="flex gap-2">
										{canUpdate ? (
											<Button
												type="button"
												variant="outline"
												onClick={() => setIsEditingProgram(true)}
											>
												Sửa
											</Button>
										) : null}

										{canDelete ? (
											<Button
												type="button"
												variant="outline"
												disabled={
													selectedProgram.courseCount > 0 ||
													selectedProgram.studentClassCount > 0 ||
													selectedProgram.studentCount > 0 ||
													deleteProgramMutation.isPending
												}
												title={
													selectedProgram.courseCount > 0 ||
													selectedProgram.studentClassCount > 0 ||
													selectedProgram.studentCount > 0
														? "Không thể xóa khi chương trình còn dữ liệu liên kết"
														: undefined
												}
												onClick={handleDeleteProgram}
											>
												Xóa
											</Button>
										) : null}
									</div>
								</div>

								<div className="grid gap-3 text-sm md:grid-cols-2">
									<div>
										<p className="text-muted-foreground text-xs uppercase">Ngành</p>
										<p>
											{selectedProgram.majorName}
											{selectedProgram.majorCode
												? ` (${selectedProgram.majorCode})`
												: ""}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Khóa học</p>
										<p>{selectedProgram.academicYear}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Tín chỉ</p>
										<p>{selectedProgram.totalCredits}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Trạng thái</p>
										<p>{getStatusLabel(selectedProgram.status)}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Lớp SV</p>
										<p>{selectedProgram.studentClassCount}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-xs uppercase">Sinh viên</p>
										<p>{selectedProgram.studentCount}</p>
									</div>
								</div>

								<div className="border-t pt-4">
									<div className="mb-3 flex items-center justify-between">
										<h3 className="font-medium text-sm">Học phần trong chương trình</h3>
										<span className="text-muted-foreground text-xs">
											{selectedProgram.courseCount} học phần
										</span>
									</div>

									{canUpdate ? (
										<form
											className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_90px_120px_auto]"
											onSubmit={handleAddProgramCourse}
										>
											<select
												className="h-9 border bg-background px-3 text-sm"
												value={programCourseForm.courseId}
												onChange={(event) =>
													setProgramCourseForm((current) => ({
														...current,
														courseId: Number(event.target.value),
													}))
												}
											>
												<option value={0}>Chọn học phần</option>
												{courses.map((item) => (
													<option key={item.id} value={item.id}>
														{item.code} - {item.name}
													</option>
												))}
											</select>
											<Input
												type="number"
												min={1}
												value={programCourseForm.semesterNo}
												onChange={(event) =>
													setProgramCourseForm((current) => ({
														...current,
														semesterNo: Number(event.target.value),
													}))
												}
												placeholder="HK"
											/>
											<select
												className="h-9 border bg-background px-3 text-sm"
												value={programCourseForm.isRequired}
												onChange={(event) =>
													setProgramCourseForm((current) => ({
														...current,
														isRequired: Number(event.target.value),
													}))
												}
											>
												<option value={1}>Bắt buộc</option>
												<option value={0}>Tự chọn</option>
											</select>
											<Button
												type="submit"
												disabled={createProgramCourseMutation.isPending}
											>
												Thêm
											</Button>
										</form>
									) : null}

									{programCoursesQuery.isLoading ? (
										<div className="flex flex-col gap-2">
											<Skeleton className="h-12 w-full" />
											<Skeleton className="h-12 w-full" />
										</div>
									) : programCourses.length === 0 ? (
										<div className="border border-dashed p-4 text-center text-muted-foreground text-sm">
											Chương trình này chưa có học phần.
										</div>
									) : (
										<div className="flex flex-col gap-2">
											{programCourses.map((item) => (
												<div
													key={item.id}
													className="flex items-start justify-between gap-3 border bg-muted/30 p-3 text-sm"
												>
													<div>
														<p className="font-medium">{item.courseName}</p>
														<p className="text-muted-foreground text-xs">
															{item.courseCode} • HK {item.semesterNo} •{" "}
																	LT {item.lectureCredits} / TH {item.practiceCredits} •{" "}
																	{item.isRequired ? "Bắt buộc" : "Tự chọn"}
														</p>
													</div>

													{canUpdate ? (
														<Button
															type="button"
															variant="outline"
															size="sm"
															disabled={deleteProgramCourseMutation.isPending}
															onClick={() =>
																deleteProgramCourseMutation.mutate({
																	programCourseId: item.id,
																})
															}
														>
															Bỏ
														</Button>
													) : null}
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
