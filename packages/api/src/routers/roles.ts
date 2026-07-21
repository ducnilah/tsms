import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { permission, role, userRole } from "@tsms/db/schema/index";
import { and, count, eq, ilike, ne, or } from "drizzle-orm";
import { z } from "zod";
import { permissionProcedure } from "../index";
import { AuthorizationService } from "../services/authorization";
import { RootGuard } from "../services/rootGuard";

const listRolesSchema = z.object({
	page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
	limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(20),
	search: z.string().trim().optional(),
}).optional();

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
		.handler(async ({ input, context }) => {
			const rootGuard = new RootGuard();
			await rootGuard.assertRoleIsNotRoot(input.roleId);

			const authUserRole = await db.select().from(userRole).where(eq(userRole.userId, context.auth.userId));

			for(const roleId of authUserRole.map(r => r.roleId)) {
				if(roleId === input.roleId) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Không thể tự xóa vai trò của chính mình",
					});
				}
			}

			await db.delete(role).where(eq(role.id, input.roleId));
			return {
				success: true,
			};
		}),

	list: permissionProcedure("roles", "read")
		.input(listRolesSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 20;
			const offset = (page - 1) * limit;

			const conditions = [
				ne(role.role_name, "admin"),
				input?.search
					? or(
							ilike(role.role_name, `%${input.search}%`),
							ilike(role.description, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [roles, totalCount] = await Promise.all([
				db.select().from(role).where(where).offset(offset).limit(limit),
				db.select({ total: count() }).from(role).where(where),
			]);

			const total = totalCount[0]?.total ?? 0;

			return {
				roles,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
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
						message: "Vai trò không tồn tại",
					});
				}

				throw error;
			}
		}),

	updateRolePermissions: permissionProcedure("roles", "update")
		.input(updateRolePermissionsSchema)
		.handler(async ({ input, context }) => {
			const rootGuard = new RootGuard();
			await rootGuard.assertRoleIsNotRoot(input.roleId);

			const { roleId, permissions } = input;
			const authorizationService = new AuthorizationService();

			const authUserRole = await db.select().from(userRole).where(eq(userRole.userId, context.auth.userId));

			for(const roleId of authUserRole.map(r => r.roleId)) {
				if(roleId === input.roleId) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Không thể tự chỉnh sửa quyền hạn vai trò của chính mình",
					});
				}
			}

			try {
				await authorizationService.updateRolePermissions(roleId, permissions);
				return await authorizationService.getRolePermissionMatrix(roleId);
			} catch {
				throw new Error("Cập nhật quyền cho vai trò thất bại");
			}
		}),
};
