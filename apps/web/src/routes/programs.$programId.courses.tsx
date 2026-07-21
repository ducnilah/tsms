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
import { ArrowLeft, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { type ProgramStatus } from "@/components/program-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/programs/$programId/courses")({
	component: ProgramCoursesRoute,
});

type ProgramSummary = {
	id: number;
	code: string;
	name: string;
	academicYear: string;
	version: number;
};

type CourseOption = {
	id: number;
	code: string;
	name: string;
	originalCourseCode?: string;
	originalCourseName?: string;
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
	departmentId: number;
};

type ProgramCourseFormState = {
	courseId: number;
	semesterNo: number;
	isRequired: number;
};

const EMPTY_PROGRAM_COURSE_FORM: ProgramCourseFormState = {
	courseId: 0,
	semesterNo: 1,
	isRequired: 1,
};

function getRequiredLabel(isRequired: number) {
	return isRequired === 1 ? "Bắt buộc" : "Tự chọn";
}

function getCourseOptionLabel(courseItem: CourseOption) {
	return `${courseItem.originalCourseCode ?? courseItem.code} - ${
		courseItem.originalCourseName ?? courseItem.name
	}`;
}

function ProgramCoursesRoute() {
	const navigate = useNavigate();
	const { programId } = Route.useParams();
	const numericProgramId = Number(programId);
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
	const canUpdate = hasPermission(permissionMap, "programs", "update");
	const canReadCourses = hasPermission(permissionMap, "courses", "read");
	const [programCourseForm, setProgramCourseForm] =
		useState<ProgramCourseFormState>(EMPTY_PROGRAM_COURSE_FORM);

	const programQuery = useQuery({
		...orpc["programs.byId"].queryOptions({
			input: { programId: numericProgramId },
		}),
		enabled: Boolean(currentUser) && canRead && numericProgramId > 0,
		meta: { skipErrorToast: !canRead },
	});

	const programCoursesQuery = useQuery({
		...orpc["programCourses.listByProgram"].queryOptions({
			input: { programId: numericProgramId },
		}),
		enabled: Boolean(currentUser) && canRead && numericProgramId > 0,
		meta: { skipErrorToast: !canRead },
	});

	const coursesQuery = useQuery({
		...orpc["courses.options"].queryOptions(),
		enabled: Boolean(currentUser) && canUpdate && canReadCourses,
		meta: { skipErrorToast: !canReadCourses },
	});

	const program = programQuery.data?.program as ProgramSummary | undefined;
	const programCourses = (programCoursesQuery.data?.programCourses ??
		[]) as ProgramCourseItem[];
	const courses = (coursesQuery.data?.courses ?? []) as CourseOption[];

	useEffect(() => {
		setProgramCourseForm({
			...EMPTY_PROGRAM_COURSE_FORM,
			courseId: courses[0]?.id ?? 0,
		});
	}, [courses]);

	const createProgramCourseMutation = useMutation(
		orpc["programCourses.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã thêm học phần vào chương trình");
				setProgramCourseForm({
					...EMPTY_PROGRAM_COURSE_FORM,
					courseId: courses[0]?.id ?? 0,
				});
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteProgramCourseMutation = useMutation(
		orpc["programCourses.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã bỏ học phần khỏi chương trình");
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleAddProgramCourse = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!canUpdate) {
			toast.error("Bạn không có quyền cập nhật chương trình đào tạo");
			return;
		}

		if (!programCourseForm.courseId) {
			toast.error("Vui lòng chọn học phần");
			return;
		}

		createProgramCourseMutation.mutate({
			programId: numericProgramId,
			courseId: programCourseForm.courseId,
			semesterNo: programCourseForm.semesterNo,
			isRequired: programCourseForm.isRequired,
		});
	};

	if (meQuery.isLoading && !currentUser) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return <main className="p-6 text-sm">Đang kiểm tra phiên đăng nhập...</main>;
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Học phần trong chương trình"
			pageDescription={
				program
					? `${program.name} (${program.code}) - khóa ${program.academicYear}, phiên bản ${program.version}`
					: "Xem và cập nhật danh sách học phần thuộc chương trình đào tạo."
			}
		>
			<div className="flex flex-col gap-4">
				<Button
					type="button"
					variant="outline"
					onClick={() =>
						navigate({ to: "/programs", search: { majorId: undefined } })
					}
				>
					<ArrowLeft data-icon="inline-start" />
					Quay lại danh sách
				</Button>

				<Card>
					<CardHeader>
						<CardTitle>Danh sách học phần</CardTitle>
						<CardDescription>
							Quản lý học phần thuộc chương trình theo từng học kỳ và tính chất
							bắt buộc/tự chọn.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{canUpdate ? (
							<form
								className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_140px_auto]"
								onSubmit={handleAddProgramCourse}
							>
								<div className="flex flex-col gap-2">
									<Label htmlFor="program-course">Học phần</Label>
									<select
										id="program-course"
										className="h-9 border bg-background px-3 text-sm"
										value={programCourseForm.courseId}
										onChange={(event) =>
											setProgramCourseForm((current) => ({
												...current,
												courseId: Number(event.target.value),
											}))
										}
										disabled={!canReadCourses}
									>
										<option value={0}>Chọn học phần</option>
										{courses.map((item) => (
											<option key={item.id} value={item.id}>
												{getCourseOptionLabel(item)}
											</option>
										))}
									</select>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="program-course-semester">Học kỳ</Label>
									<Input
										id="program-course-semester"
										type="number"
										min={1}
										value={programCourseForm.semesterNo}
										onChange={(event) =>
											setProgramCourseForm((current) => ({
												...current,
												semesterNo: Number(event.target.value),
											}))
										}
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="program-course-required">Tính chất</Label>
									<select
										id="program-course-required"
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
								</div>

								<div className="flex items-end">
									<Button
										type="submit"
										disabled={
											createProgramCourseMutation.isPending ||
											coursesQuery.isLoading ||
											!canReadCourses
										}
									>
										Thêm
									</Button>
								</div>
							</form>
						) : null}

						<div className="overflow-hidden border">
							<div className="max-h-[31rem] overflow-y-auto">
								<table className="w-full table-fixed text-[15px]">
									<colgroup>
										<col />
										<col className="w-24" />
										<col className="w-32" />
										<col className="w-28" />
									</colgroup>
									<thead className="sticky top-0 z-10 bg-muted text-left">
										<tr>
											<th className="px-4 py-3 font-medium">Học phần</th>
											<th className="px-4 py-3 font-medium">Học kỳ</th>
											<th className="px-4 py-3 font-medium">Tính chất</th>
											<th className="px-4 py-3 text-right font-medium">Thao tác</th>
										</tr>
									</thead>
									<tbody>
										{programQuery.isLoading || programCoursesQuery.isLoading ? (
											Array.from({ length: 6 }).map((_, index) => (
												<tr key={index} className="border-t">
													<td colSpan={4} className="px-4 py-4">
														<Skeleton className="h-6 w-full" />
													</td>
												</tr>
											))
										) : programQuery.error || programCoursesQuery.error ? (
											<tr>
												<td colSpan={4} className="px-4 py-10 text-center text-destructive">
													Không thể tải danh sách học phần trong chương trình.
												</td>
											</tr>
										) : programCourses.length === 0 ? (
											<tr>
												<td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
													Chương trình này chưa có học phần.
												</td>
											</tr>
										) : (
											programCourses.map((item) => (
												<tr key={item.id} className="border-t hover:bg-muted/40">
													<td className="px-4 py-4">
														<div className="font-medium">{item.courseName}</div>
														<div className="text-muted-foreground text-xs">
															{item.courseCode}
														</div>
													</td>
													<td className="px-4 py-4">HK {item.semesterNo}</td>
													<td className="px-4 py-4">
														{getRequiredLabel(item.isRequired)}
													</td>
													<td className="px-4 py-4 text-right">
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
																<Trash2 data-icon="inline-start" />
																Bỏ
															</Button>
														) : null}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
