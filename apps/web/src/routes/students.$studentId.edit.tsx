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
	EMPTY_STUDENT_FORM,
	StudentForm,
	type StudentClassOption,
	type StudentFormState,
	type StudentProgramOption,
} from "@/components/student-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/students/$studentId/edit")({
	component: EditStudentRoute,
});

function toDateInput(value: string | Date) {
	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "";
	}

	return date.toISOString().slice(0, 10);
}

function EditStudentRoute() {
	const navigate = useNavigate();
	const { studentId } = Route.useParams();
	const numericStudentId = Number(studentId);
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
	const canUpdate = hasPermission(permissionMap, "students", "update");
	const [studentForm, setStudentForm] =
		useState<StudentFormState>(EMPTY_STUDENT_FORM);

	const studentQuery = useQuery({
		...orpc["students.byId"].queryOptions({
			input: { studentId: numericStudentId },
		}),
		enabled: Boolean(currentUser) && numericStudentId > 0,
	});
	const programsQuery = useQuery({
		...orpc["programs.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const studentClassesQuery = useQuery({
		...orpc["studentClasses.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const programs = (programsQuery.data?.programs ?? []) as StudentProgramOption[];
	const studentClasses = (studentClassesQuery.data?.studentClasses ??
		[]) as StudentClassOption[];

	useEffect(() => {
		const student = studentQuery.data?.student;
		if (!student) return;

		setStudentForm({
			studentCode: student.studentCode,
			name: student.name,
			dob: toDateInput(student.dob),
			email: student.email,
			phone: student.phone,
			classId: student.classId,
			programId: student.programId,
			status: student.status as StudentFormState["status"],
		});
	}, [studentQuery.data]);

	const updateStudentMutation = useMutation(
		orpc["students.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật sinh viên");
				await queryClient.invalidateQueries();
				navigate({ to: "/students" });
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleSubmit = () => {
		if (!studentForm.classId || !studentForm.programId) {
			toast.error("Vui lòng chọn lớp sinh viên và chương trình đào tạo");
			return;
		}

		updateStudentMutation.mutate({
			studentId: numericStudentId,
			studentCode: studentForm.studentCode,
			name: studentForm.name,
			dob: studentForm.dob,
			email: studentForm.email,
			phone: studentForm.phone,
			classId: studentForm.classId,
			programId: studentForm.programId,
			status: studentForm.status,
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
			pageTitle="Chỉnh sửa sinh viên"
			pageDescription="Cập nhật hồ sơ, lớp, chương trình đào tạo và trạng thái sinh viên."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
				<div>
					<Button type="button" variant="outline" onClick={() => navigate({ to: "/students" })}>
						<ArrowLeft data-icon="inline-start" />
						Quay lại danh sách
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Thông tin sinh viên</CardTitle>
						<CardDescription>
							Cập nhật thông tin cá nhân và dữ liệu học vụ liên quan.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{studentQuery.isLoading ||
						programsQuery.isLoading ||
						studentClassesQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : studentQuery.error ||
							programsQuery.error ||
							studentClassesQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin sinh viên.
							</p>
						) : (
							<StudentForm
								mode="edit"
								value={studentForm}
								programs={programs}
								studentClasses={studentClasses}
								canSubmit={canUpdate}
								isPending={updateStudentMutation.isPending}
								onChange={setStudentForm}
								onSubmit={handleSubmit}
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
