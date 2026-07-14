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
import { Checkbox } from "@tsms/ui/components/checkbox";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Skeleton } from "@tsms/ui/components/skeleton";
import { Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ListControls } from "@/components/list-controls";
import { orpc, queryClient } from "@/utils/orpc";
import { ACTION_BITS, hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/roles")({
	component: RolesRoute,
});

const ROOT_ROLE_NAME = "admin";

const ACTION_ORDER = [
	{ key: "create", label: "Tạo", bit: ACTION_BITS.create },
	{ key: "read", label: "Xem", bit: ACTION_BITS.read },
	{ key: "update", label: "Sửa", bit: ACTION_BITS.update },
	{ key: "delete", label: "Xóa", bit: ACTION_BITS.delete },
] as const;

type DraftPermissionMap = Record<string, number>;

function RolesRoute() {
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
	const canReadRoles = hasPermission(permissionMap, "roles", "read");
	const canCreateRoles = hasPermission(permissionMap, "roles", "create");
	const canUpdateRoles = hasPermission(permissionMap, "roles", "update");
	const canDeleteRoles = hasPermission(permissionMap, "roles", "delete");

	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const limit = 10;

	const rolesQuery = useQuery({
		...orpc["roles.list"].queryOptions({
			input: {
				page,
				limit,
				search: search.trim() || undefined,
			},
		}),
		enabled: Boolean(currentUser) && canReadRoles,
		meta: { skipErrorToast: !canReadRoles },
	});
	const catalogQuery = useQuery({
		...orpc["roles.getPermissionCatalog"].queryOptions(),
		enabled: Boolean(currentUser) && canReadRoles,
		meta: { skipErrorToast: !canReadRoles },
	});

	const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
	const [createForm, setCreateForm] = useState({
		name: "",
		description: "",
	});
	const [draftPermissions, setDraftPermissions] = useState<DraftPermissionMap>({});

	const rolePermissionsQuery = useQuery({
		...orpc["roles.getRolePermissionMatrix"].queryOptions({
			input: { roleId: selectedRoleId },
		}),
		enabled: Boolean(currentUser) && canReadRoles && selectedRoleId > 0,
		meta: { skipErrorToast: !canReadRoles },
	});

	const roles = rolesQuery.data?.roles ?? [];
	const pagination = rolesQuery.data?.pagination;
	const visibleRoles = roles.filter(
		(item) => item.role_name !== ROOT_ROLE_NAME,
	);
	const permissionCatalog = catalogQuery.data?.permissions ?? [];

	useEffect(() => {
		if (selectedRoleId === 0 && visibleRoles.length > 0) {
			setSelectedRoleId(visibleRoles[0].id);
		}
	}, [visibleRoles, selectedRoleId]);

	useEffect(() => {
		if (visibleRoles.length === 0) {
			setSelectedRoleId(0);
			return;
		}

		if (!visibleRoles.some((item) => item.id === selectedRoleId)) {
			setSelectedRoleId(visibleRoles[0].id);
		}
	}, [visibleRoles, selectedRoleId]);

	useEffect(() => {
		if (!rolePermissionsQuery.data) {
			return;
		}

		const nextDraft = Object.fromEntries(
			rolePermissionsQuery.data.permissions.map((item) => [
				item.key,
				item.assignedValue,
			]),
		);
		setDraftPermissions(nextDraft);
	}, [rolePermissionsQuery.data]);

	const invalidateRoleQueries = async () => {
		await queryClient.invalidateQueries();
	};

	const createRoleMutation = useMutation(
		orpc["roles.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo vai trò");
				setCreateForm({ name: "", description: "" });
				setSelectedRoleId(data.role.id);
				await invalidateRoleQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteRoleMutation = useMutation(
		orpc["roles.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa vai trò");
				await invalidateRoleQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updatePermissionsMutation = useMutation(
		orpc["roles.updateRolePermissions"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật quyền");
				setDraftPermissions(
					Object.fromEntries(
						data.permissions.map((item) => [item.key, item.assignedValue]),
					),
				);
				await invalidateRoleQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleCreateRole = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!canCreateRoles) {
			toast.error("Tài khoản này không có quyền tạo vai trò");
			return;
		}

		createRoleMutation.mutate(createForm);
	};

	const handleDeleteRole = () => {
		if (!selectedRoleId) {
			toast.error("Vui lòng chọn vai trò");
			return;
		}

		const currentRole = roles.find((item) => item.id === selectedRoleId);

		if (!currentRole) {
			toast.error("Vai trò hiện tại không còn tồn tại");
			return;
		}

		if (!confirm(`Xóa vai trò ${currentRole.role_name}?`)) {
			return;
		}

		deleteRoleMutation.mutate({ roleId: selectedRoleId });
	};

	const handleSavePermissions = () => {
		if (!selectedRoleId) {
			toast.error("Vui lòng chọn vai trò");
			return;
		}

		updatePermissionsMutation.mutate({
			roleId: selectedRoleId,
			permissions: permissionCatalog.map((item) => ({
				permissionKey: item.key,
				value: draftPermissions[item.key] ?? 0,
			})),
		});
	};

	const togglePermission = (permissionKey: string, bit: number, enabled: boolean) => {
		setDraftPermissions((current) => {
			const currentValue = current[permissionKey] ?? 0;
			const nextValue = enabled ? currentValue | bit : currentValue & ~bit;

			return {
				...current,
				[permissionKey]: nextValue,
			};
		});
	};

	const selectedRole = useMemo(
		() => visibleRoles.find((item) => item.id === selectedRoleId) ?? null,
		[visibleRoles, selectedRoleId],
	);

	if (meQuery.isLoading && !currentUser) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return <main className="p-6 text-sm">Đang kiểm tra phiên đăng nhập...</main>;
	}

	if (!canReadRoles) {
		return (
			<AppShell
				currentUser={currentUser}
				permissionMap={permissionMap}
				pageTitle="Quản lý vai trò"
				pageDescription="Tài khoản này không có quyền xem mô đun quản lý vai trò."
			>
				<Card>
					<CardHeader>
						<CardTitle>Không đủ quyền truy cập</CardTitle>
						<CardDescription>
							Hãy liên hệ quản trị viên nếu bạn cần được cấp quyền phù hợp.
						</CardDescription>
					</CardHeader>
				</Card>
			</AppShell>
		);
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Quản lý vai trò"
			pageDescription="Tạo vai trò, xóa vai trò và chỉnh sửa quyền cho từng mô đun quản lý."
		>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
				<div className="grid gap-5 xl:grid-cols-[340px_1fr]">
					<div className="flex flex-col gap-5">
						{canCreateRoles ? (
							<Card>
								<CardHeader>
									<CardTitle>Tạo vai trò</CardTitle>
									<CardDescription>
										Tạo vai trò mới để phân công cho người dùng trong hệ thống.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<form onSubmit={handleCreateRole} className="flex flex-col gap-4">
										<div className="flex flex-col gap-2">
											<Label htmlFor="role-name">Tên vai trò</Label>
											<Input
												id="role-name"
												value={createForm.name}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														name: event.target.value,
													}))
												}
												required
											/>
										</div>
										<div className="flex flex-col gap-2">
											<Label htmlFor="role-description">Mô tả</Label>
											<Input
												id="role-description"
												value={createForm.description}
												onChange={(event) =>
													setCreateForm((current) => ({
														...current,
														description: event.target.value,
													}))
												}
												required
											/>
										</div>
										<Button type="submit" disabled={createRoleMutation.isPending}>
											<Plus data-icon="inline-start" />
											Tạo vai trò
										</Button>
									</form>
								</CardContent>
							</Card>
						) : null}

						<Card>
							<CardHeader>
								<CardTitle>Danh sách vai trò</CardTitle>
								<CardDescription>
									Chọn một vai trò để xem và chỉnh sửa quyền sử dụng.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="mb-4">
									<ListControls
										search={search}
										onSearchChange={(value) => {
											setSearch(value);
											setPage(1);
										}}
										pagination={pagination}
										onPageChange={setPage}
									/>
								</div>
								{rolesQuery.isLoading ? (
									<div className="flex flex-col gap-3">
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-10 w-full" />
									</div>
								) : rolesQuery.error ? (
									<p className="text-destructive text-sm">
										Không thể tải danh sách vai trò.
									</p>
								) : visibleRoles.length === 0 ? (
									<div className="border px-3 py-4 text-sm">
										Chưa có vai trò nào khả dụng để quản lý.
									</div>
								) : (
									<div className="flex flex-col gap-2">
										{visibleRoles.map((item) => (
											<button
												key={item.id}
												type="button"
												onClick={() => setSelectedRoleId(item.id)}
												className={`flex flex-col items-start gap-1 border px-3 py-3 text-left text-sm transition-colors ${
													selectedRoleId === item.id
														? "border-foreground bg-muted"
														: "hover:bg-muted/60"
												}`}
											>
												<span className="font-medium">{item.role_name}</span>
												<span className="text-muted-foreground text-xs">
													{item.description}
												</span>
											</button>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
								<div>
									<CardTitle>
										{selectedRole
											? `Quyền của vai trò: ${selectedRole.role_name}`
											: "Quyền của vai trò"}
									</CardTitle>
									<CardDescription>
										Bạn có thể bật hoặc tắt quyền thao tác của vai trò này tại
										từng mô đun quản lý.
									</CardDescription>
								</div>
								<div className="flex gap-2">
									{canDeleteRoles ? (
										<Button
											type="button"
											variant="outline"
											disabled={!selectedRoleId || deleteRoleMutation.isPending}
											onClick={handleDeleteRole}
										>
											<Trash2 data-icon="inline-start" />
											Xóa vai trò
										</Button>
									) : null}
									{canUpdateRoles ? (
										<Button
											type="button"
											disabled={
												!selectedRoleId ||
												updatePermissionsMutation.isPending ||
												catalogQuery.isLoading ||
												rolePermissionsQuery.isLoading
											}
											onClick={handleSavePermissions}
										>
											<Save data-icon="inline-start" />
											Lưu thay đổi
										</Button>
									) : null}
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{catalogQuery.isLoading ||
							(selectedRoleId > 0 && rolePermissionsQuery.isLoading) ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-12 w-full" />
									<Skeleton className="h-12 w-full" />
									<Skeleton className="h-12 w-full" />
								</div>
							) : catalogQuery.error || rolePermissionsQuery.error ? (
								<p className="text-destructive text-sm">
									Không thể tải thông tin quyền cho vai trò này.
								</p>
							) : !selectedRoleId ? (
								<div className="border px-3 py-4 text-sm">
									Hãy chọn một vai trò để bắt đầu chỉnh sửa quyền.
								</div>
							) : permissionCatalog.length === 0 ? (
								<div className="border px-3 py-4 text-sm">
									Chưa có danh mục quyền để cấu hình.
								</div>
							) : (
								<div className="overflow-x-auto border">
									<table className="w-full min-w-[780px] text-sm">
										<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
											<tr>
												<th className="p-3">Mô đun</th>
												<th className="p-3">Mô tả</th>
												{ACTION_ORDER.map((action) => (
													<th key={action.key} className="p-3 text-center">
														{action.label}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{permissionCatalog.map((permissionItem) => {
												const currentValue = draftPermissions[permissionItem.key] ?? 0;
												const rolePermissionItem =
													rolePermissionsQuery.data?.permissions.find(
														(item) => item.key === permissionItem.key,
													);
												const maxValue =
													rolePermissionItem?.maxValue ?? permissionItem.bitValue;

												return (
													<tr key={permissionItem.key} className="border-t">
														<td className="p-3 font-medium">
															{permissionItem.key}
														</td>
														<td className="p-3">{permissionItem.name}</td>
														{ACTION_ORDER.map((action) => {
															const supported =
																(maxValue & action.bit) === action.bit;
															const checked =
																(currentValue & action.bit) === action.bit;

															return (
																<td key={action.key} className="p-3 text-center">
																	<div className="translate-x-7.5">
																		<Checkbox
																		checked={checked}
																		disabled={!supported || !canUpdateRoles}
																		onCheckedChange={(value) =>
																			togglePermission(
																			permissionItem.key,
																			action.bit,
																			Boolean(value),
																			)
																		}
																		/>
																	</div>
																</td>
															);
														})}
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</AppShell>
	);
}
