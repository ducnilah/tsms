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
	EMPTY_PROGRAM_FORM,
	ProgramForm,
	type ProgramFormState,
	type ProgramMajorOption,
} from "@/components/program-form";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/programs/create")({
	component: CreateProgramRoute,
});

function CreateProgramRoute() {
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
	const canCreate = hasPermission(permissionMap, "programs", "create");
	const [programForm, setProgramForm] = useState<ProgramFormState>({
		...EMPTY_PROGRAM_FORM,
		academicYear: new Date().getFullYear().toString(),
	});

	const majorsQuery = useQuery({
		...orpc["majors.options"].queryOptions(),
		enabled: Boolean(currentUser),
	});
	const majors = (majorsQuery.data?.majors ?? []) as ProgramMajorOption[];

	const createProgramMutation = useMutation(
		orpc["programs.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo chương trình đào tạo");
				await queryClient.invalidateQueries();
				navigate({
					to: "/programs/$programId/courses",
					params: { programId: String(data.program.id) },
					search: { majorId: undefined },
				});
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
			pageTitle="Tạo chương trình đào tạo"
			pageDescription="Tạo chương trình đào tạo mới trước khi gắn danh sách học phần."
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
							Sau khi tạo xong, hệ thống sẽ chuyển sang màn chỉnh sửa để thêm học phần.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ProgramForm
							mode="create"
							value={programForm}
							majors={majors}
							canSubmit={canCreate}
							isPending={createProgramMutation.isPending}
							onChange={setProgramForm}
							onSubmit={() => {
								if (!programForm.majorId) {
									toast.error("Vui lòng chọn ngành");
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
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</AppShell>
	);
}
