import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
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
import { Lock, LockOpen, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { getAccessToken } from "@/utils/auth-storage";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/users")({
	beforeLoad: () => {
		if (typeof window !== "undefined" && !getAccessToken()) {
			throw redirect({ to: "/login" });
		}
	},
	component: UsersRoute,
});

function UsersRoute() {
	const usersQuery = useQuery(orpc["users.list"].queryOptions());
	const rolesQuery = useQuery(orpc["roles.list"].queryOptions());

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

	const users = usersQuery.data?.users ?? [];
	const roles = rolesQuery.data?.roles ?? [];

	const selectedResetUser = useMemo(
		() => users.find((item) => item.id === resetForm.userId),
		[users, resetForm.userId],
	);
	const selectedAssignUser = useMemo(
		() => users.find((item) => item.id === assignForm.userId),
		[users, assignForm.userId],
	);

	const invalidateUsers = () => {
		queryClient.invalidateQueries();
	};

	const createMutation = useMutation(
		orpc["users.create"].mutationOptions({
			onSuccess: () => {
				toast.success("Đã tạo người dùng");
				setCreateForm({ username: "", email: "", password: "", roleIds: [] });
				invalidateUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const lockMutation = useMutation(
		orpc["users.lock"].mutationOptions({
			onSuccess: () => {
				toast.success("Đã khóa người dùng");
				invalidateUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const unlockMutation = useMutation(
		orpc["users.unlock"].mutationOptions({
			onSuccess: () => {
				toast.success("Đã mở khóa người dùng");
				invalidateUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const resetPasswordMutation = useMutation(
		orpc["users.resetPassword"].mutationOptions({
			onSuccess: () => {
				toast.success("Đã đặt lại mật khẩu");
				setResetForm({ userId: 0, password: "" });
				invalidateUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const assignRolesMutation = useMutation(
		orpc["users.assignRoles"].mutationOptions({
			onSuccess: () => {
				toast.success("Đã cập nhật vai trò");
				setAssignForm({ userId: 0, roleIds: [] });
				invalidateUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const handleCreate = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
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

	if (usersQuery.isLoading || rolesQuery.isLoading) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (usersQuery.error || rolesQuery.error) {
		return (
			<main className="p-6 text-destructive text-sm">
				Không thể tải dữ liệu quản trị. Hãy kiểm tra tài khoản có vai trò admin.
			</main>
		);
	}

	return (
		<main className="min-h-svh bg-muted/30 p-5">
			<div className="mx-auto flex max-w-7xl flex-col gap-5">
				<div>
					<p className="text-muted-foreground text-xs uppercase tracking-widest">
						Quản trị
					</p>
					<h1 className="font-semibold text-2xl">Quản lý người dùng</h1>
				</div>

				<div className="grid gap-5 xl:grid-cols-[380px_1fr]">
					<Card>
						<CardHeader>
							<CardTitle>Tạo người dùng</CardTitle>
							<CardDescription>
								Admin tạo tài khoản và gán vai trò ban đầu.
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

								<RoleChecklist
									label="Vai trò"
									roles={roles}
									selectedRoleIds={createForm.roleIds}
									onToggle={toggleCreateRole}
								/>

								<Button type="submit" disabled={createMutation.isPending}>
									<Plus data-icon="inline-start" />
									Tạo người dùng
								</Button>
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Danh sách người dùng</CardTitle>
							<CardDescription>
								Khóa, mở khóa, đặt lại mật khẩu và gán vai trò.
							</CardDescription>
						</CardHeader>
						<CardContent>
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
										{users.map((item) => (
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
															? "Đang hoạt động"
															: "Đã khóa"}
													</span>
												</td>
												<td className="flex flex-wrap gap-2 p-3">
													{item.status === "active" ? (
														<Button
															type="button"
															variant="outline"
															onClick={() => {
																if (confirm(`Khóa tài khoản ${item.email}?`)) {
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
													)}

													<Button
														type="button"
														variant="outline"
														onClick={() =>
															setResetForm({ userId: item.id, password: "" })
														}
													>
														<RotateCcw data-icon="inline-start" />
														Reset
													</Button>

													<Button
														type="button"
														variant="outline"
														onClick={() =>
															setAssignForm({
																userId: item.id,
																roleIds: item.roles.map(
																	(userRole) => userRole.id,
																),
															})
														}
													>
														<ShieldCheck data-icon="inline-start" />
														Vai trò
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</CardContent>
					</Card>
				</div>

				{selectedResetUser ? (
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

				{selectedAssignUser ? (
					<Card>
						<CardHeader>
							<CardTitle>Gán vai trò</CardTitle>
							<CardDescription>
								Người dùng: {selectedAssignUser.email}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={handleAssignRoles}
								className="flex flex-col gap-4"
							>
								<RoleChecklist
									roles={roles}
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
		</main>
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
						<input
							type="checkbox"
							checked={selectedRoleIds.includes(item.id)}
							onChange={() => onToggle(item.id)}
						/>
						{item.role_name}
					</label>
				))}
			</div>
		</div>
	);
}
