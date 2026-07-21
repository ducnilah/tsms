import { ORPCError, os } from "@orpc/server";
import { db } from "@tsms/db";
import { user } from "@tsms/db/schema/user";
import { eq } from "drizzle-orm";

import type { PermissionAction } from "./constants/permissions";
import type { Context } from "./context";
import { AuthorizationService } from "./services/authorization";

export const o = os.$context<Context>();

export const publicProcedure = o;

const authorizationService = new AuthorizationService();

export const protectedProcedure = o.use(async ({ context, next }) => {
	if (!context.auth) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Bạn cần đăng nhập để thực hiện hành động này",
		});
	}

	const [currentUser] = await db
		.select()
		.from(user)
		.where(eq(user.id, context.auth.userId));

	if (!currentUser || currentUser.status !== "active") {
		throw new ORPCError("FORBIDDEN", {
			message: "Tài khoản không tồn tại hoặc đã bị khóa",
		});
	}

	return next({
		context: {
			auth: context.auth,
			currentUser,
		},
	});
});

export const permissionProcedure = (
	permissionKey: string,
	action: PermissionAction,
) =>
	protectedProcedure.use(async ({ context, next }) => {
		const allowed = await authorizationService.hasPermission(
			context.auth.userId,
			permissionKey,
			action,
		);

		if (!allowed) {
			throw new ORPCError("FORBIDDEN", {
				message: `Tài khoản này không có quyền thực hiện hành động ${action} trên ${permissionKey}`,
			});
		}

		return next({
			context: {
				auth: context.auth,
			},
		});
	});
