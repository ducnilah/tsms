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
import { Lock, LockOpen, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/users")({
	component: UsersRoute,
});

const ROOT_ROLE_NAME = "admin";

function UsersRoute() {
	const navigate = useNavigate();
	const meQuery = useQuery({
		...orpc["auth.me"].queryOptions(),
		retry: false,
		meta: { skipErrorToast: true },
	});

	const [createForm, setCreateForm] = useState({
		username: "",
		email: "",
		password: "",
		roleIds: [] as number[],
	});
	const [resetForm, setResetForm] = useState({
		userId: 0,
		password: "",
	});
	const [assignForm, setAssignForm] = useState({
		userId: 0,
		roleIds: [] as number[],
	});

	useEffect(() => {
		if (meQuery.isError && !meQuery.data?.user) {
			navigate({ to: "/login" });
		}
	}, [meQuery.data, meQuery.isError, navigate]);

	const currentUser = meQuery.data?.user ?? null;
	const permissionMap = meQuery.data?.permissionMap ?? {};
	const canReadUsers = hasPermission(permissionMap, "users", "read");
	const canCreateUsers = hasPermission(permissionMap, "users", "create");
	const canUpdateUsers = hasPermission(permissionMap, "users", "update");
	const canReadRoles = hasPermission(permissionMap, "roles", "read");

	const usersQuery = useQuery({
		...orpc["users.list"].queryOptions(),
		enabled: Boolean(currentUser) && canReadUsers,
		meta: { skipErrorToast: !canReadUsers },
	});
	const rolesQuery = useQuery({
		...orpc["roles.list"].queryOptions(),
		enabled: Boolean(currentUser) && canReadRoles,
		meta: { skipErrorToast: !canReadRoles },
	});

	const users = usersQuery.data?.users ?? [];
	const roles = rolesQuery.data?.roles ?? [];
	const visibleUsers = users.filter(
		(item) =>
			!item.roles.some((role) => role.roleName === ROOT_ROLE_NAME),
	);
	const visibleRoles = roles.filter(
		(item) => item.role_name !== ROOT_ROLE_NAME,
	);

	const selectedResetUser = useMemo(
		() => visibleUsers.find((item) => item.id === resetForm.userId),
		[visibleUsers, resetForm.userId],
	);
	const selectedAssignUser = useMemo(
		() => visibleUsers.find((item) => item.id === assignForm.userId),
		[visibleUsers, assignForm.userId],
	);

	const invalidateManagementQueries = async () => {
		await queryClient.invalidateQueries();
	};

	const createMutation = useMutation(
		orpc["users.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo người dùng");
				setCreateForm({ username: "", email: "", password: "", roleIds: [] });
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const lockMutation = useMutation(
		orpc["users.lock"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã khóa người dùng");
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const unlockMutation = useMutation(
		orpc["users.unlock"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã mở khóa người dùng");
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const resetPasswordMutation = useMutation(
		orpc["users.resetPassword"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã đặt lại mật khẩu");
				setResetForm({ userId: 0, password: "" });
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const assignRolesMutation = useMutation(
		orpc["users.assignRoles"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật vai trò");
				setAssignForm({ userId: 0, roleIds: [] });
				await invalidateManagementQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleCreate = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!canCreateUsers) {
			toast.error("Tài khoản này không có quyền tạo người dùng");
			return;
		}

		createMutation.mutate(createForm);
	};

	const handleResetPassword = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!resetForm.userId) {
			toast.error("Vui lòng chọn người dùng");
			return;
		}

		resetPasswordMutation.mutate(resetForm);
	};

	const handleAssignRoles = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!assignForm.userId) {
			toast.error("Vui lòng chọn người dùng");
			return;
		}

		assignRolesMutation.mutate(assignForm);
	};

	const toggleCreateRole = (roleId: number) => {
		setCreateForm((current) => ({
			...current,
			roleIds: current.roleIds.includes(roleId)
				? current.roleIds.filter((id) => id !== roleId)
				: [...current.roleIds, roleId],
		}));
	};

	const toggleAssignRole = (roleId: number) => {
		setAssignForm((current) => ({
			...current,
			roleIds: current.roleIds.includes(roleId)
				? current.roleIds.filter((id) => id !== roleId)
				: [...current.roleIds, roleId],
		}));
	};

	if (meQuery.isLoading && !currentUser) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return <main className="p-6 text-sm">Đang kiểm tra phiên đăng nhập...</main>;
	}

	if (!canReadUsers) {
		return (
			<AppShell
				currentUser={currentUser}
				permissionMap={permissionMap}
				pageTitle="Quản lý người dùng"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý người dùng."
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
			pageTitle="Quản lý người dùng"
			pageDescription="Tạo tài khoản, khóa tài khoản, đặt lại mật khẩu và gán vai trò."
		>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
				<div className="grid gap-5 xl:grid-cols-[380px_1fr]">
					{canCreateUsers ? (
						<Card>
							<CardHeader>
								<CardTitle>Tạo người dùng</CardTitle>
								<CardDescription>
									Tạo tài khoản mới và gán vai trò ban đầu nếu cần.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleCreate} className="flex flex-col gap-4">
									<div className="flex flex-col gap-2">
										<Label htmlFor="username">Tên đăng nhập</Label>
										<Input
											id="username"
											value={createForm.username}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													username: event.target.value,
												}))
											}
											required
										/>
									</div>

									<div className="flex flex-col gap-2">
										<Label htmlFor="email">Email</Label>
										<Input
											id="email"
											type="email"
											value={createForm.email}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													email: event.target.value,
												}))
											}
											required
										/>
									</div>

									<div className="flex flex-col gap-2">
										<Label htmlFor="password">Mật khẩu</Label>
										<Input
											id="password"
											type="password"
											minLength={6}
											value={createForm.password}
											onChange={(event) =>
												setCreateForm((current) => ({
													...current,
													password: event.target.value,
												}))
											}
											required
										/>
									</div>

									{canReadRoles ? (
										<RoleChecklist
											label="Vai trò"
											roles={visibleRoles}
											selectedRoleIds={createForm.roleIds}
											onToggle={toggleCreateRole}
										/>
									) : null}

									<Button type="submit" disabled={createMutation.isPending}>
										<Plus data-icon="inline-start" />
										Tạo người dùng
									</Button>
								</form>
							</CardContent>
						</Card>
					) : null}

					<Card>
						<CardHeader>
							<CardTitle>Danh sách người dùng</CardTitle>
							<CardDescription>
								Khóa, mở khóa, đặt lại mật khẩu và cập nhật vai trò cho người
								dùng.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{usersQuery.isLoading || rolesQuery.isLoading ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
								</div>
							) : usersQuery.error || rolesQuery.error ? (
								<p className="text-destructive text-sm">
									Không thể tải dữ liệu quản lý người dùng.
								</p>
							) : (
								<div className="overflow-x-auto border">
									<table className="w-full min-w-[760px] text-sm">
										<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
											<tr>
												<th className="p-3">Người dùng</th>
												<th className="p-3">Email</th>
												<th className="p-3">Vai trò</th>
												<th className="p-3">Trạng thái</th>
												<th className="p-3">Hành động</th>
											</tr>
										</thead>
										<tbody>
											{visibleUsers.map((item) => (
												<tr key={item.id} className="border-t">
													<td className="p-3 font-medium">{item.username}</td>
													<td className="p-3">{item.email}</td>
													<td className="p-3">
														{item.roles.length > 0
															? item.roles
																	.map((userRole) => userRole.roleName)
																	.join(", ")
															: "Chưa có"}
													</td>
													<td className="p-3">
														<span className="border px-2 py-1 text-xs">
															{item.status === "active"
																? "Hoạt động"
																: "Đã khóa"}
														</span>
													</td>
													<td className="flex flex-wrap gap-2 p-3">
														{canUpdateUsers ? (
															item.status === "active" ? (
																<Button
																	type="button"
																	variant="outline"
																	onClick={() => {
																		if (
																			confirm(
																				`Khóa tài khoản ${item.email}?`,
																			)
																		) {
																			lockMutation.mutate({ userId: item.id });
																		}
																	}}
																>
																	<Lock data-icon="inline-start" />
																	Khóa
																</Button>
															) : (
																<Button
																	type="button"
																	variant="outline"
																	onClick={() =>
																		unlockMutation.mutate({ userId: item.id })
																	}
																>
																	<LockOpen data-icon="inline-start" />
																	Mở khóa
																</Button>
															)
														) : null}

														{canUpdateUsers ? (
															<Button
																type="button"
																variant="outline"
																onClick={() =>
																	setResetForm({
																		userId: item.id,
																		password: "",
																	})
																}
															>
																<RotateCcw data-icon="inline-start" />
																Đặt lại mật khẩu
															</Button>
														) : null}

														{canUpdateUsers && canReadRoles ? (
															<Button
																type="button"
																variant="outline"
																onClick={() =>
																	setAssignForm({
																		userId: item.id,
																		roleIds: item.roles.map((userRole) => userRole.id),
																	})
																}
															>
																<ShieldCheck data-icon="inline-start" />
																Chỉnh vai trò
															</Button>
														) : null}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{selectedResetUser && canUpdateUsers ? (
					<Card>
						<CardHeader>
							<CardTitle>Đặt lại mật khẩu</CardTitle>
							<CardDescription>
								Người dùng: {selectedResetUser.email}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={handleResetPassword}
								className="flex max-w-md flex-col gap-4"
							>
								<Input
									type="password"
									minLength={6}
									placeholder="Mật khẩu mới"
									value={resetForm.password}
									onChange={(event) =>
										setResetForm((current) => ({
											...current,
											password: event.target.value,
										}))
									}
									required
								/>
								<div className="flex gap-2">
									<Button
										type="submit"
										disabled={resetPasswordMutation.isPending}
									>
										Lưu mật khẩu mới
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => setResetForm({ userId: 0, password: "" })}
									>
										Hủy
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				) : null}

				{selectedAssignUser && canUpdateUsers && canReadRoles ? (
					<Card>
						<CardHeader>
							<CardTitle>Chỉnh sửa vai trò</CardTitle>
							<CardDescription>
								Người dùng: {selectedAssignUser.email}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleAssignRoles} className="flex flex-col gap-4">
								<RoleChecklist
									roles={visibleRoles}
									selectedRoleIds={assignForm.roleIds}
									onToggle={toggleAssignRole}
								/>

								<div className="flex gap-2">
									<Button
										type="submit"
										disabled={assignRolesMutation.isPending}
									>
										Lưu vai trò
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => setAssignForm({ userId: 0, roleIds: [] })}
									>
										Hủy
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				) : null}
			</div>
		</AppShell>
	);
}

type RoleItem = {
	id: number;
	role_name: string;
};

type RoleChecklistProps = {
	label?: string;
	roles: RoleItem[];
	selectedRoleIds: number[];
	onToggle: (roleId: number) => void;
};

function RoleChecklist({
	label,
	roles,
	selectedRoleIds,
	onToggle,
}: RoleChecklistProps) {
	return (
		<div className="flex flex-col gap-2">
			{label ? <Label>{label}</Label> : null}
			<div className="flex flex-wrap gap-2">
				{roles.map((item) => (
					<label
						key={item.id}
						className="flex items-center gap-2 border px-3 py-2 text-xs"
					>
						<Checkbox
							checked={selectedRoleIds.includes(item.id)}
							onCheckedChange={() => onToggle(item.id)}
						/>
						{item.role_name}
					</label>
				))}
			</div>
		</div>
	);
}
