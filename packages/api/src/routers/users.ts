import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { role } from "@tsms/db/schema/role";
import { session } from "@tsms/db/schema/session";
import { user } from "@tsms/db/schema/user";
import { userRole } from "@tsms/db/schema/userRole";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { RootGuard } from "../services/rootGuard";

import { permissionProcedure } from "../index";
import { authService } from "../services/auth";

const createUserSchema = z.object({
	username: z.string().min(3, "Vui long nhap ten nguoi dung it nhat 3 ky tu"),
	email: z.email("Vui long nhap dia chi email hop le"),
	password: z.string().min(6, "Vui long nhap mat khau it nhat 6 ky tu"),
	roleIds: z.array(z.number()).default([]),
});

const userIdSchema = z.object({
	userId: z.number(),
});

const resetPasswordSchema = z.object({
	userId: z.number(),
	password: z.string().min(6, "Vui long nhap mat khau it nhat 6 ky tu"),
});

const assignRolesSchema = z.object({
	userId: z.number(),
	roleIds: z.array(z.number()).default([]),
});

async function revokeUserSessions(userId: number) {
	await db
		.update(session)
		.set({ revokedAt: new Date() })
		.where(and(eq(session.userId, userId), isNull(session.revokedAt)));
}

async function getUsersWithRoles() {
	const users = await db
		.select({
			id: user.id,
			username: user.username,
			email: user.email,
			status: user.status,
			createdAt: user.createdAt,
		})
		.from(user);

	const userIds = users.map((item) => item.id);

	if (userIds.length === 0) {
		return [];
	}

	const roleRows = await db
		.select({
			userId: userRole.userId,
			roleId: role.id,
			roleName: role.role_name,
			description: role.description,
		})
		.from(userRole)
		.innerJoin(role, eq(userRole.roleId, role.id))
		.where(inArray(userRole.userId, userIds));

	return users.map((item) => ({
		...item,
		roles: roleRows
			.filter((roleRow) => roleRow.userId === item.id)
			.map((roleRow) => ({
				id: roleRow.roleId,
				roleName: roleRow.roleName,
				description: roleRow.description,
			})),
	}));
}

async function validateRoleIds(roleIds: number[]) {
	if (roleIds.length === 0) {
		return [];
	}

	const roles = await db
		.select({
			id: role.id,
		})
		.from(role)
		.where(inArray(role.id, roleIds));

	if (roles.length !== roleIds.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Danh sach vai tro khong hop le",
		});
	}

	return roles;
}

export const usersRouter = {
	list: permissionProcedure("users", "read").handler(async () => {
		return {
			users: await getUsersWithRoles(),
		};
	}),

	create: permissionProcedure("users", "create")
		.input(createUserSchema)
		.handler(async ({ input }) => {
			const [existingUserByEmail] = await db
				.select()
				.from(user)
				.where(eq(user.email, input.email));

			if (existingUserByEmail) {
				throw new ORPCError("CONFLICT", {
					message: "Email da duoc su dung",
				});
			}

			const [existingUserByUsername] = await db
				.select()
				.from(user)
				.where(eq(user.username, input.username));

			if (existingUserByUsername) {
				throw new ORPCError("CONFLICT", {
					message: "Ten dang nhap da duoc su dung",
				});
			}

			const uniqueRoleIds = [...new Set(input.roleIds)];
			await validateRoleIds(uniqueRoleIds);
			const hashedPassword = await authService.hashPassword(input.password);

			const [newUser] = await db
				.insert(user)
				.values({
					username: input.username,
					email: input.email,
					hashedPassword,
					status: "active",
				})
				.returning();

			if (!newUser) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Khong the tao nguoi dung",
				});
			}

			if (uniqueRoleIds.length > 0) {
				await db.insert(userRole).values(
					uniqueRoleIds.map((roleId) => ({
						userId: newUser.id,
						roleId,
					})),
				);
			}

			return {
				user: newUser,
			};
		}),

	lock: permissionProcedure("users", "update")
		.input(userIdSchema)
		.handler(async ({ input, context }) => {
			const rootGuard = new RootGuard();
			await rootGuard.assertUserIsNotRoot(input.userId);

			if (input.userId === context.auth.userId) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Không thể tự khóa tài khoản của chính mình",
				});
			}

			await db
				.update(user)
				.set({ status: "locked" })
				.where(eq(user.id, input.userId));
			await revokeUserSessions(input.userId);

			return {
				success: true,
			};
		}),

	unlock: permissionProcedure("users", "update")
		.input(userIdSchema)
		.handler(async ({ input }) => {
			await db
				.update(user)
				.set({ status: "active" })
				.where(eq(user.id, input.userId));

			return {
				success: true,
			};
		}),

	resetPassword: permissionProcedure("users", "update")
		.input(resetPasswordSchema)
		.handler(async ({ input }) => {
			const rootGuard = new RootGuard();
			await rootGuard.assertUserIsNotRoot(input.userId);

			const hashedPassword = await authService.hashPassword(input.password);

			await db
				.update(user)
				.set({ hashedPassword })
				.where(eq(user.id, input.userId));
			await revokeUserSessions(input.userId);

			return {
				success: true,
			};
		}),

	assignRoles: permissionProcedure("users", "update")
		.input(assignRolesSchema)
		.handler(async ({ input, context }) => {
			const rootGuard = new RootGuard();
			if (await rootGuard.isRootUserByAssignedRoles(input.roleIds)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Không thể gán vai trò ROOT cho người dùng thông thường",
				});
			}

			const uniqueRoleIds = [...new Set(input.roleIds)];
			await validateRoleIds(uniqueRoleIds);

			if (input.userId === context.auth.userId) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Không thể tự chỉnh sửa vai trò của chính mình",
				});
			}

			await db.delete(userRole).where(eq(userRole.userId, input.userId));

			if (uniqueRoleIds.length > 0) {
				await db.insert(userRole).values(
					uniqueRoleIds.map((roleId) => ({
						userId: input.userId,
						roleId,
					})),
				);
			}

			return {
				success: true,
			};
		}),
};
