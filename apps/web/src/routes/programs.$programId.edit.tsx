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
	EMPTY_PROGRAM_FORM,
	ProgramForm,
	type ProgramFormState,
	type ProgramMajorOption,
} from "@/components/program-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/programs/$programId/edit")({
	component: EditProgramRoute,
});

type ProgramDetail = ProgramFormState & {
	id: number;
	majorName: string;
	majorCode: string;
	courseCount: number;
	studentClassCount: number;
	studentCount: number;
};

function EditProgramRoute() {
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
	const [programForm, setProgramForm] =
		useState<ProgramFormState>(EMPTY_PROGRAM_FORM);

	const programQuery = useQuery({
		...orpc["programs.byId"].queryOptions({
			input: { programId: numericProgramId },
		}),
		enabled: Boolean(currentUser) && canRead && numericProgramId > 0,
		meta: { skipErrorToast: !canRead },
	});

	const majorsQuery = useQuery({
		...orpc["majors.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const program = programQuery.data?.program as ProgramDetail | undefined;
	const majors = (majorsQuery.data?.majors ?? []) as ProgramMajorOption[];

	useEffect(() => {
		if (!program) return;

		setProgramForm({
			majorId: program.majorId,
			code: program.code,
			name: program.name,
			academicYear: program.academicYear,
			version: program.version,
			totalCredits: program.totalCredits,
			status: program.status,
		});
	}, [program]);

	const updateProgramMutation = useMutation(
		orpc["programs.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật chương trình đào tạo");
				await queryClient.invalidateQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

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
			pageTitle="Thay đổi thông tin chương trình"
			pageDescription="Cập nhật mã, tên, ngành, khóa học và trạng thái chương trình đào tạo."
		>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
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
						<CardTitle>Thông tin chương trình</CardTitle>
						<CardDescription>
							Chỉ chỉnh sửa thông tin chung của chương trình. Danh sách học phần
							được quản lý ở màn học phần riêng.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{programQuery.isLoading || majorsQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-32 w-full" />
							</div>
						) : programQuery.error || majorsQuery.error ? (
							<p className="text-destructive text-sm">
								Không thể tải thông tin chương trình đào tạo.
							</p>
						) : (
							<ProgramForm
								mode="edit"
								value={programForm}
								majors={majors}
								canSubmit={canUpdate}
								isPending={updateProgramMutation.isPending}
								onChange={setProgramForm}
								onSubmit={() => {
									if (!programForm.majorId) {
										toast.error("Vui lòng chọn ngành");
										return;
									}

									updateProgramMutation.mutate({
										programId: numericProgramId,
										...programForm,
									});
								}}
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
