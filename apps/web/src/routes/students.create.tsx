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
	EMPTY_STUDENT_FORM,
	StudentForm,
	type StudentClassOption,
	type StudentFormState,
	type StudentProgramOption,
} from "@/components/student-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/students/create")({
	component: CreateStudentRoute,
});

function CreateStudentRoute() {
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
	const canCreate = hasPermission(permissionMap, "students", "create");
	const [studentForm, setStudentForm] =
		useState<StudentFormState>(EMPTY_STUDENT_FORM);

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

	const createStudentMutation = useMutation(
		orpc["students.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo sinh viên");
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
			pageTitle="Tạo sinh viên"
			pageDescription="Tạo mới hồ sơ sinh viên và gán vào lớp, chương trình đào tạo."
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
							Nhập hồ sơ cơ bản, lớp sinh viên và chương trình đào tạo.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<StudentForm
							mode="create"
							value={studentForm}
							programs={programs}
							studentClasses={studentClasses}
							canSubmit={canCreate}
							isPending={createStudentMutation.isPending}
							onChange={setStudentForm}
							onSubmit={handleSubmit}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
