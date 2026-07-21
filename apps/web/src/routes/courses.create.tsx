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

export const Route = createFileRoute("/courses/create")({
	component: CreateCourseRoute,
});

function CreateCourseRoute() {
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
	const canCreate = hasPermission(permissionMap, "courses", "create");
	const [courseForm, setCourseForm] = useState<CourseFormState>(EMPTY_COURSE_FORM);

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

	const createCourseMutation = useMutation(
		orpc["courses.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo học phần");
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

		createCourseMutation.mutate({
			code: courseForm.code,
			name: courseForm.name,
			lectureCredits: courseForm.lectureCredits,
			practiceCredits: courseForm.practiceCredits,
			departmentId: courseForm.departmentId,
			description: courseForm.description.trim() || undefined,
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
			pageTitle="Tạo học phần"
			pageDescription="Tạo học phần thuộc bộ môn, cấu hình tín chỉ lý thuyết/thực hành."
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
							Số buổi sẽ được tự tính từ số tín chỉ lý thuyết và thực hành.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<CourseForm
							mode="create"
							value={courseForm}
							faculties={faculties}
							departments={departments}
							canSubmit={canCreate}
							isPending={createCourseMutation.isPending}
							onChange={setCourseForm}
							onSubmit={handleSubmit}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
