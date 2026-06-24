import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { permission, role, rolePermission } from "@tsms/db/schema/index";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";
import { AuthorizationService } from "../services/authorization";

const createRoleSchema = z.object({
	name: z.string().min(3, "Vui lòng nhập tên vai trò ít nhất 3 ký tự"),
	description: z.string().min(3, "Vui lòng nhập mô tả vai trò ít nhất 3 ký tự"),
});

const roleIdSchema = z.object({
	roleId: z.number(),
});

const updateRolePermissionsSchema = z.object({
	roleId: z.number(),
	permissions: z.array(
		z.object({
			permissionKey: z.string(),
			value: z.number(),
		}),
	),
});

export const rolesRouter = {
	createRole: permissionProcedure("roles", "create")
		.input(createRoleSchema)
		.handler(async ({ input }) => {
			const [newRole] = await db
				.insert(role)
				.values({
					role_name: input.name,
					description: input.description,
				})
				.returning();

			return {
				role: newRole,
			};
		}),

	deleteRole: permissionProcedure("roles", "delete")
		.input(roleIdSchema)
		.handler(async ({ input }) => {
			await db.delete(role).where(eq(role.id, input.roleId));
			return {
				success: true,
			};
		}),

	list: permissionProcedure("roles", "read").handler(async () => {
		const roles = await db.select().from(role);

		return {
			roles,
		};
	}),

	getPermissionCatalog: permissionProcedure("roles", "read").handler(
		async () => {
			const permissions = await db
				.select({
					id: permission.id,
					key: permission.key,
					name: permission.name,
					bitValue: permission.bitValue,
				})
				.from(permission);

			return {
				permissions,
			};
		},
	),

	getRolePermissionMatrix: permissionProcedure("roles", "read")
		.input(roleIdSchema)
		.handler(async ({ input }) => {
			try {
				const authorizationService = new AuthorizationService();
				return await authorizationService.getRolePermissionMatrix(
					input.roleId,
				);
			} catch (error) {
				if (
					error instanceof Error &&
					error.message === "ROLE_NOT_FOUND"
				) {
					throw new ORPCError("NOT_FOUND", {
						message: "Vai tro khong ton tai",
					});
				}

				throw error;
			}
		}),

	updateRolePermissions: permissionProcedure("roles", "update")
		.input(updateRolePermissionsSchema)
		.handler(async ({ input }) => {
			const { roleId, permissions } = input;
			const authorizationService = new AuthorizationService();
			try {
				await authorizationService.updateRolePermissions(roleId, permissions);
				return await authorizationService.getRolePermissionMatrix(roleId);
			} catch {
				throw new Error("Cập nhật quyền cho vai trò thất bại");
			}
		}),
};
