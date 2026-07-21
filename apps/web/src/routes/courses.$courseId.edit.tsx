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
import { Skeleton } from "@tsms/ui/components/skeleton";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import {
	CourseForm,
	EMPTY_COURSE_FORM,
	isValidCourseCredit,
	type CourseDepartmentOption,
	type CourseFacultyOption,
	type CourseFormState,
} from "@/components/course-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/courses/$courseId/edit")({
	component: EditCourseRoute,
});

function EditCourseRoute() {
	const navigate = useNavigate();
	const { courseId } = Route.useParams();
	const numericCourseId = Number(courseId);
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
	const canUpdate = hasPermission(permissionMap, "courses", "update");
	const [courseForm, setCourseForm] = useState<CourseFormState>(EMPTY_COURSE_FORM);

	const courseQuery = useQuery({
		...orpc["courses.byId"].queryOptions({
			input: { courseId: numericCourseId },
		}),
		enabled: Boolean(currentUser) && numericCourseId > 0,
	});
	const facultiesQuery = useQuery({
		...orpc["faculties.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const departmentsQuery = useQuery({
		...orpc["departments.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const faculties = (facultiesQuery.data?.faculties ?? []) as CourseFacultyOption[];
	const departments = (departmentsQuery.data?.departments ?? []) as CourseDepartmentOption[];

	useEffect(() => {
		const course = courseQuery.data?.course;
		if (!course) return;

		setCourseForm({
			code: course.code,
			name: course.name,
			lectureCredits: course.lectureCredits,
			practiceCredits: course.practiceCredits,
			facultyId: course.facultyId ?? 0,
			departmentId: course.departmentId,
			description: course.description ?? "",
			status: course.status as CourseFormState["status"],
		});
	}, [courseQuery.data]);

	const updateCourseMutation = useMutation(
		orpc["courses.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật học phần");
				await queryClient.invalidateQueries();
				navigate({ to: "/courses" });
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSubmit = () => {
		if (!courseForm.departmentId) {
			toast.error("Vui lòng chọn bộ môn");
			return;
		}
		if (
			!isValidCourseCredit(courseForm.lectureCredits) ||
			!isValidCourseCredit(courseForm.practiceCredits)
		) {
			toast.error("Tín chỉ phải chia hết cho 0.5 và nếu có thì phải từ 1 trở lên");
			return;
		}
		if (courseForm.lectureCredits + courseForm.practiceCredits <= 0) {
			toast.error("Học phần phải có ít nhất một tín chỉ");
			return;
		}

		updateCourseMutation.mutate({
			courseId: numericCourseId,
			code: courseForm.code,
			name: courseForm.name,
			lectureCredits: courseForm.lectureCredits,
			practiceCredits: courseForm.practiceCredits,
			departmentId: courseForm.departmentId,
			description: courseForm.description.trim() || undefined,
			status: courseForm.status,
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
			pageTitle="Chỉnh sửa học phần"
			pageDescription="Cập nhật thông tin học phần, tín chỉ, bộ môn và trạng thái."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<div>
					<Button type="button" variant="outline" onClick={() => navigate({ to: "/courses" })}>
						<ArrowLeft data-icon="inline-start" />
						Quay lại danh sách
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin học phần</CardTitle>
						<CardDescription>
							Số buổi học sẽ được tính lại khi thay đổi số tín chỉ.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{courseQuery.isLoading ||
						facultiesQuery.isLoading ||
						departmentsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : courseQuery.error || facultiesQuery.error || departmentsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin học phần.
							</p>
						) : (
							<CourseForm
								mode="edit"
								value={courseForm}
								faculties={faculties}
								departments={departments}
								canSubmit={canUpdate}
								isPending={updateCourseMutation.isPending}
								onChange={setCourseForm}
								onSubmit={handleSubmit}
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
