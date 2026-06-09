import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { role } from "@tsms/db/schema/role";
import { session } from "@tsms/db/schema/session";
import { user } from "@tsms/db/schema/user";
import { userRole } from "@tsms/db/schema/userRole";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../index";
import { authService } from "../services/auth";

const createUserSchema = z.object({
	username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
	email: z.email("Email không hợp lệ"),
	password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
	roleIds: z.array(z.number()).default([]),
});

const userIdSchema = z.object({
	userId: z.number(),
});

const resetPasswordSchema = z.object({
	userId: z.number(),
	password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
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

export const usersRouter = {
	list: adminProcedure.handler(async () => {
		return {
			users: await getUsersWithRoles(),
		};
	}),

	create: adminProcedure.input(createUserSchema).handler(async ({ input }) => {
		const [existingUserByEmail] = await db
			.select()
			.from(user)
			.where(eq(user.email, input.email));

		if (existingUserByEmail) {
			throw new ORPCError("CONFLICT", {
				message: "Email đã được sử dụng",
			});
		}

		const [existingUserByUsername] = await db
			.select()
			.from(user)
			.where(eq(user.username, input.username));

		if (existingUserByUsername) {
			throw new ORPCError("CONFLICT", {
				message: "Tên đăng nhập đã được sử dụng",
			});
		}

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
				message: "Không thể tạo người dùng",
			});
		}

		if (input.roleIds.length > 0) {
			await db.insert(userRole).values(
				input.roleIds.map((roleId) => ({
					userId: newUser.id,
					roleId,
				})),
			);
		}

		return {
			user: newUser,
		};
	}),

	lock: adminProcedure
		.input(userIdSchema)
		.handler(async ({ input, context }) => {
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

	unlock: adminProcedure.input(userIdSchema).handler(async ({ input }) => {
		await db
			.update(user)
			.set({ status: "active" })
			.where(eq(user.id, input.userId));

		return {
			success: true,
		};
	}),

	resetPassword: adminProcedure
		.input(resetPasswordSchema)
		.handler(async ({ input }) => {
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

	assignRoles: adminProcedure
		.input(assignRolesSchema)
		.handler(async ({ input, context }) => {
			if (input.userId === context.auth.userId) {
				const selectedRoles =
					input.roleIds.length > 0
						? await db
								.select()
								.from(role)
								.where(inArray(role.id, input.roleIds))
						: [];
				const stillAdmin = selectedRoles.some(
					(item) => item.role_name === "admin",
				);

				if (!stillAdmin) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Không thể tự gỡ vai trò admin của chính mình",
					});
				}
			}

			await db.delete(userRole).where(eq(userRole.userId, input.userId));

			if (input.roleIds.length > 0) {
				await db.insert(userRole).values(
					input.roleIds.map((roleId) => ({
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

export const rolesRouter = {
	list: adminProcedure.handler(async () => {
		const roles = await db.select().from(role);

		return {
			roles,
		};
	}),
};
