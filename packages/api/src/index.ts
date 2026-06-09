import { ORPCError, os } from "@orpc/server";
import { db } from "@tsms/db";
import { role } from "@tsms/db/schema/role";
import { user } from "@tsms/db/schema/user";
import { userRole } from "@tsms/db/schema/userRole";
import { and, eq } from "drizzle-orm";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

export const protectedProcedure = o.use(async ({ context, next }) => {
	if (!context.auth) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Bạn cần đăng nhập để thực hiện hành động này",
		});
	}

	const [userData] = await db
		.select()
		.from(user)
		.where(eq(user.id, context.auth.userId));

	if (!userData || userData.status !== "active") {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Tài khoản không tồn tại hoặc đã bị khóa",
		});
	}

	return next({
		context: {
			auth: context.auth,
		},
	});
});

export const adminProcedure = protectedProcedure.use(
	async ({ context, next }) => {
		const [adminRole] = await db
			.select()
			.from(userRole)
			.innerJoin(role, eq(userRole.roleId, role.id))
			.where(
				and(
					eq(userRole.userId, context.auth.userId),
					eq(role.role_name, "admin"),
				),
			);

		if (!adminRole) {
			throw new ORPCError("FORBIDDEN", {
				message: "Bạn không có quyền quản trị người dùng",
			});
		}

		return next({
			context,
		});
	},
);
