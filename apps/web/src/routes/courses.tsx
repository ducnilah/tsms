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
import { BookOpen, Lock, LockOpen, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ListControls } from "@/components/list-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/courses")({
	component: CoursesRoute,
});

type CourseStatus = "active" | "inactive";

type CourseItem = {
	id: number;
	code: string;
	name: string;
	credits: number;
	lectureSessions: number;
	labSessions: number;
	practiceSessions: number;
	departmentId: number;
	description: string | null;
	status: CourseStatus;
	departmentCode?: string;
	departmentName?: string;
	facultyId?: number;
};

type DepartmentOption = {
	id: number;
	facultyId: number;
	code: string;
	name: string;
	status: CourseStatus;
};

type FacultyOption = {
	id: number;
	code: string;
	name: string;
	status: CourseStatus;
};

type CourseFormState = {
	courseId: number;
	code: string;
	name: string;
	credits: number;
	lectureSessions: number;
	labSessions: number;
	practiceSessions: number;
	departmentId: number;
	description: string;
	status: CourseStatus;
};

const EMPTY_COURSE_FORM: CourseFormState = {
	courseId: 0,
	code: "",
	name: "",
	credits: 3,
	lectureSessions: 0,
	labSessions: 0,
	practiceSessions: 0,
	departmentId: 0,
	description: "",
	status: "active",
};

function CoursesRoute() {
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
	const canRead = hasPermission(permissionMap, "courses", "read");
	const canCreate = hasPermission(permissionMap, "courses", "create");
	const canUpdate = hasPermission(permissionMap, "courses", "update");
	const canDelete = hasPermission(permissionMap, "courses", "delete");

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [facultyFilterId, setFacultyFilterId] = useState(0);
	const [departmentFilterId, setDepartmentFilterId] = useState(0);
	const limit = 6;

	const coursesQuery = useQuery({
		...orpc["courses.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
				status: statusFilter ? (statusFilter as CourseStatus) : undefined,
				facultyId: facultyFilterId || undefined,
				departmentId: departmentFilterId || undefined,
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
	const departmentsQuery = useQuery({
		...orpc["departments.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const [selectedCourseId, setSelectedCourseId] = useState(0);
	const [isCreatingCourse, setIsCreatingCourse] = useState(false);
	const [courseForm, setCourseForm] = useState<CourseFormState>(EMPTY_COURSE_FORM);

	const courses = (coursesQuery.data?.courses ?? []) as CourseItem[];
	const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];
	const departments = (departmentsQuery.data?.departments ?? []) as DepartmentOption[];
	const pagination = coursesQuery.data?.pagination;
	const selectedCourse = useMemo(
		() => courses.find((item) => item.id === selectedCourseId) ?? null,
		[courses, selectedCourseId],
	);
	const formDepartments = courseForm.departmentId
		? departments
		: departments.filter((item) => !facultyFilterId || item.facultyId === facultyFilterId);

	useEffect(() => {
		if (!isCreatingCourse && selectedCourseId === 0 && courses.length > 0) {
			setSelectedCourseId(courses[0].id);
		}
	}, [courses, isCreatingCourse, selectedCourseId]);

	useEffect(() => {
		if (courses.length === 0) {
			setSelectedCourseId(0);
			if (!isCreatingCourse) {
				setCourseForm(EMPTY_COURSE_FORM);
			}
			return;
		}

		if (!isCreatingCourse && !courses.some((item) => item.id === selectedCourseId)) {
			setSelectedCourseId(courses[0].id);
		}
	}, [courses, isCreatingCourse, selectedCourseId]);

	useEffect(() => {
		if (isCreatingCourse || !selectedCourse) {
			return;
		}

		setCourseForm({
			courseId: selectedCourse.id,
			code: selectedCourse.code,
			name: selectedCourse.name,
			credits: selectedCourse.credits,
			lectureSessions: selectedCourse.lectureSessions,
			labSessions: selectedCourse.labSessions,
			practiceSessions: selectedCourse.practiceSessions,
			departmentId: selectedCourse.departmentId,
			description: selectedCourse.description ?? "",
			status: selectedCourse.status,
		});
	}, [isCreatingCourse, selectedCourse]);

	const invalidateCourses = async () => {
		await queryClient.invalidateQueries();
	};

	const createCourseMutation = useMutation(
		orpc["courses.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo học phần");
				setIsCreatingCourse(false);
				setSelectedCourseId(data.course.id);
				await invalidateCourses();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const updateCourseMutation = useMutation(
		orpc["courses.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật học phần");
				setIsCreatingCourse(false);
				setSelectedCourseId(data.course.id);
				await invalidateCourses();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const deleteCourseMutation = useMutation(
		orpc["courses.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa học phần");
				setIsCreatingCourse(false);
				setCourseForm(EMPTY_COURSE_FORM);
				await invalidateCourses();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const lockCourseMutation = useMutation(
		orpc["courses.lock"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã khóa học phần");
				await invalidateCourses();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const unlockCourseMutation = useMutation(
		orpc["courses.unlock"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã mở khóa học phần");
				await invalidateCourses();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSaveCourse = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!courseForm.departmentId) {
			toast.error("Vui lòng chọn bộ môn");
			return;
		}

		const payload = {
			code: courseForm.code,
			name: courseForm.name,
			credits: courseForm.credits,
			lectureSessions: courseForm.lectureSessions,
			labSessions: courseForm.labSessions,
			practiceSessions: courseForm.practiceSessions,
			departmentId: courseForm.departmentId,
			description: courseForm.description || undefined,
		};

		if (courseForm.courseId > 0) {
			updateCourseMutation.mutate({
				...payload,
				courseId: courseForm.courseId,
				status: courseForm.status,
			});
			return;
		}

		createCourseMutation.mutate(payload);
	};

	const beginCreateCourse = () => {
		setIsCreatingCourse(true);
		setSelectedCourseId(0);
		setCourseForm({
			...EMPTY_COURSE_FORM,
			departmentId: departments[0]?.id ?? 0,
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
				pageTitle="Quản lý học phần"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý học phần."
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
			pageTitle="Quản lý học phần"
			pageDescription="Quản lý mã học phần, số tín chỉ, số buổi học và bộ môn phụ trách."
		>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_460px]">
				<Card>
					<CardHeader>
						<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
							<div>
								<CardTitle>Danh sách học phần</CardTitle>
								<CardDescription>
									Tìm theo mã/tên học phần và lọc theo khoa, bộ môn, trạng thái.
								</CardDescription>
							</div>
							{canCreate ? (
								<Button type="button" variant="outline" onClick={beginCreateCourse}>
									<Plus data-icon="inline-start" />
									Tạo học phần
								</Button>
							) : null}
						</div>
					</CardHeader>
					<CardContent>
						<div className="mb-4 flex flex-col gap-3">
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
								statusOptions={[
									{ label: "Đang hoạt động", value: "active" },
									{ label: "Ngừng hoạt động", value: "inactive" },
								]}
								pagination={pagination}
								onPageChange={setPage}
							/>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="course-filter-faculty">Khoa</Label>
									<select
										id="course-filter-faculty"
										className="border bg-background px-3 py-2 text-sm"
										value={facultyFilterId}
										onChange={(event) => {
											setFacultyFilterId(Number(event.target.value));
											setDepartmentFilterId(0);
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
									<Label htmlFor="course-filter-department">Bộ môn</Label>
									<select
										id="course-filter-department"
										className="border bg-background px-3 py-2 text-sm"
										value={departmentFilterId}
										onChange={(event) => {
											setDepartmentFilterId(Number(event.target.value));
											setPage(1);
										}}
									>
										<option value={0}>Tất cả bộ môn</option>
										{departments
											.filter((item) => !facultyFilterId || item.facultyId === facultyFilterId)
											.map((item) => (
												<option key={item.id} value={item.id}>
													{item.name}
												</option>
											))}
									</select>
								</div>
							</div>
						</div>

						{coursesQuery.isLoading || facultiesQuery.isLoading || departmentsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : coursesQuery.error ? (
							<p className="text-destructive text-sm">Không thể tải danh sách học phần.</p>
						) : courses.length === 0 ? (
							<div className="flex flex-col items-center gap-3 border border-dashed p-8 text-center">
								<BookOpen className="size-10 text-muted-foreground" />
								<div>
									<p className="font-medium">Chưa có học phần</p>
									<p className="text-muted-foreground text-sm">
										Hãy tạo học phần đầu tiên hoặc đổi điều kiện tìm kiếm.
									</p>
								</div>
							</div>
						) : (
							<div className="overflow-x-auto border">
								<table className="w-full min-w-[920px] text-sm">
									<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
										<tr>
											<th className="p-3">Học phần</th>
											<th className="p-3">Bộ môn</th>
											<th className="p-3">Buổi học</th>
											<th className="p-3">Tín chỉ</th>
											<th className="p-3">Trạng thái</th>
											<th className="p-3 text-right">Thao tác</th>
										</tr>
									</thead>
									<tbody>
										{courses.map((item) => (
											<tr
												key={item.id}
												className={
													selectedCourseId === item.id
														? "border-t bg-muted/70"
														: "border-t hover:bg-muted/40"
												}
											>
												<td className="p-3">
													<div className="font-medium">{item.name}</div>
													<div className="text-muted-foreground text-xs">{item.code}</div>
												</td>
												<td className="p-3">
													<div>{item.departmentName ?? "Không xác định"}</div>
													<div className="text-muted-foreground text-xs">
														{item.departmentCode ?? `ID ${item.departmentId}`}
													</div>
												</td>
												<td className="p-3 text-xs">
													LT {item.lectureSessions} • Lab {item.labSessions} • TH{" "}
													{item.practiceSessions}
												</td>
												<td className="p-3">{item.credits}</td>
												<td className="p-3">{item.status}</td>
												<td className="p-3">
													<div className="flex justify-end gap-2">
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => {
																setIsCreatingCourse(false);
																setSelectedCourseId(item.id);
															}}
														>
															<Pencil data-icon="inline-start" />
															Sửa
														</Button>
														{canUpdate ? (
															item.status === "active" ? (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() => lockCourseMutation.mutate({ courseId: item.id })}
																>
																	<Lock data-icon="inline-start" />
																	Khóa
																</Button>
															) : (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() => unlockCourseMutation.mutate({ courseId: item.id })}
																>
																	<LockOpen data-icon="inline-start" />
																	Mở
																</Button>
															)
														) : null}
													</div>
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
							{courseForm.courseId > 0 ? "Cập nhật học phần" : "Tạo học phần"}
						</CardTitle>
						<CardDescription>
							Số buổi được lưu theo buổi học, không phải số giờ.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSaveCourse} className="flex flex-col gap-4">
							<div className="grid gap-3 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="course-code">Mã học phần</Label>
									<Input
										id="course-code"
										value={courseForm.code}
										onChange={(event) =>
											setCourseForm((current) => ({ ...current, code: event.target.value }))
										}
										required
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="course-credits">Tín chỉ</Label>
									<Input
										id="course-credits"
										type="number"
										min={1}
										value={courseForm.credits}
										onChange={(event) =>
											setCourseForm((current) => ({
												...current,
												credits: Number(event.target.value),
											}))
										}
										required
									/>
								</div>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="course-name">Tên học phần</Label>
								<Input
									id="course-name"
									value={courseForm.name}
									onChange={(event) =>
										setCourseForm((current) => ({ ...current, name: event.target.value }))
									}
									required
								/>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="course-department">Bộ môn</Label>
								<select
									id="course-department"
									className="h-9 border bg-background px-3 text-sm"
									value={courseForm.departmentId}
									onChange={(event) =>
										setCourseForm((current) => ({
											...current,
											departmentId: Number(event.target.value),
										}))
									}
									required
								>
									<option value={0}>Chọn bộ môn</option>
									{formDepartments.map((item) => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
							</div>

							<div className="grid gap-3 md:grid-cols-3">
								<div className="flex flex-col gap-2">
									<Label htmlFor="course-lecture">Buổi lý thuyết</Label>
									<Input
										id="course-lecture"
										type="number"
										min={0}
										value={courseForm.lectureSessions}
										onChange={(event) =>
											setCourseForm((current) => ({
												...current,
												lectureSessions: Number(event.target.value),
											}))
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="course-lab">Buổi lab</Label>
									<Input
										id="course-lab"
										type="number"
										min={0}
										value={courseForm.labSessions}
										onChange={(event) =>
											setCourseForm((current) => ({
												...current,
												labSessions: Number(event.target.value),
											}))
										}
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="course-practice">Buổi thực hành</Label>
									<Input
										id="course-practice"
										type="number"
										min={0}
										value={courseForm.practiceSessions}
										onChange={(event) =>
											setCourseForm((current) => ({
												...current,
												practiceSessions: Number(event.target.value),
											}))
										}
									/>
								</div>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="course-description">Mô tả</Label>
								<Input
									id="course-description"
									value={courseForm.description}
									onChange={(event) =>
										setCourseForm((current) => ({
											...current,
											description: event.target.value,
										}))
									}
								/>
							</div>

							{courseForm.courseId > 0 ? (
								<div className="flex flex-col gap-2">
									<Label htmlFor="course-status">Trạng thái</Label>
									<select
										id="course-status"
										className="h-9 border bg-background px-3 text-sm"
										value={courseForm.status}
										onChange={(event) =>
											setCourseForm((current) => ({
												...current,
												status: event.target.value as CourseStatus,
											}))
										}
									>
										<option value="active">Đang hoạt động</option>
										<option value="inactive">Ngừng hoạt động</option>
									</select>
								</div>
							) : null}

							<div className="flex flex-wrap gap-2">
								{(courseForm.courseId > 0 ? canUpdate : canCreate) ? (
									<Button
										type="submit"
										disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
									>
										<Save data-icon="inline-start" />
										Lưu học phần
									</Button>
								) : null}
								<Button type="button" variant="outline" onClick={beginCreateCourse}>
									Làm mới
								</Button>
								{courseForm.courseId > 0 && canDelete ? (
									<Button
										type="button"
										variant="destructive"
										disabled={deleteCourseMutation.isPending}
										onClick={() => {
											if (selectedCourse && confirm(`Xóa học phần ${selectedCourse.code}?`)) {
												deleteCourseMutation.mutate({ courseId: selectedCourse.id });
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
