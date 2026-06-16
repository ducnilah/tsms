import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { session } from "@tsms/db/schema/session";
import { user } from "@tsms/db/schema/user";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import {
	clearAuthCookies,
	getRefreshTokenFromCookie,
	REFRESH_TOKEN_MAX_AGE,
	setAccessTokenCookie,
	setAuthCookies,
} from "../services/auth-cookie";
import { authService } from "../services/auth";

const loginSchema = z.object({
	email: z.email("Vui lòng nhập email hợp lệ"),
	password: z.string(),
});

const registerSchema = z.object({
	username: z.string(),
	email: z.email("Vui lòng nhập email hợp lệ"),
	password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

const toAuthUserProfile = (userData: typeof user.$inferSelect) => ({
	id: userData.id,
	username: userData.username,
	email: userData.email,
	status: userData.status,
	createdAt: userData.createdAt,
});

const createAuthResponse = async(
	honoContext: Parameters<typeof setAuthCookies>[0],
	userData: typeof user.$inferSelect,
) => {
	const refreshToken = authService.generateRefreshToken();
	const hashedRefreshToken = await authService.hashRefreshToken(refreshToken);

	await db.insert(session).values({
		userId: userData.id,
		refreshToken: hashedRefreshToken,
		expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000),
	});

	const accessToken = await authService.generateAccessToken(userData.id, userData.email);
	
	setAuthCookies(honoContext, {
		accessToken,
		refreshToken,
	});

	return {
		user: toAuthUserProfile(userData),
	}
}

const findValidSessionByRefreshToken = async (refreshToken: string) => {
	const sessions = await db.select().from(session);
	const now = new Date();

	for (const sessionData of sessions) {
		if (sessionData.revokedAt || sessionData.expiresAt <= now) {
			continue;
		}

		const isTokenValid = await authService.compareRefreshToken(
			refreshToken,
			sessionData.refreshToken,
		);

		if (isTokenValid) {
			return sessionData;
		}
	}

	return null;
};

export const authRouter = {
	login: publicProcedure
		.input(loginSchema)
		.handler(async ({ input, context }) => {
			const [userData] = await db
				.select()
				.from(user)
				.where(eq(user.email, input.email));

			if (!userData) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "Email hoặc mật khẩu không đúng",
				});
			}

			if (userData.status !== "active") {
				throw new ORPCError("UNAUTHORIZED", {
					message: "Tài khoản đã bị khóa",
				});
			}

			const isPasswordValid = await authService.comparePassword(
				input.password,
				userData.hashedPassword,
			);

			if (!isPasswordValid) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "Email hoặc mật khẩu không đúng",
				});
			}

			return createAuthResponse(context.honoContext, userData);
		}),

	register: publicProcedure
		.input(registerSchema)
		.handler(async ({ input, context }) => {
			const [existingUser] = await db
				.select()
				.from(user)
				.where(eq(user.email, input.email));

			if (existingUser) {
				throw new ORPCError("CONFLICT", {
					message: "Email đã được sử dụng",
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
					message: "Không thể tạo tài khoản",
				});
			}

			return createAuthResponse(context.honoContext, newUser);
		}),

	refresh: publicProcedure.handler(async ({ context }) => {
		const refreshToken = getRefreshTokenFromCookie(context.honoContext);

		if (!refreshToken) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Phiên đăng nhập không còn hợp lệ",
			});
		}

		const sessionData = await findValidSessionByRefreshToken(refreshToken);

		if (!sessionData) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Refresh token không hợp lệ hoặc đã hết hạn",
			});
		}

		const [userData] = await db
			.select()
			.from(user)
			.where(eq(user.id, sessionData.userId));

		if (!userData) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Người dùng không tồn tại",
			});
		}

		if (userData.status !== "active") {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Tài khoản đã bị khóa",
			});
		}

		const accessToken = await authService.generateAccessToken(
			userData.id,
			userData.email,
		);

		setAccessTokenCookie(context.honoContext, accessToken);

		return {
			success: true,
		};
	}),

	logout: publicProcedure.handler(async ({ context }) => {
		const refreshToken = getRefreshTokenFromCookie(context.honoContext);

		if (refreshToken) {
			const sessionData = await findValidSessionByRefreshToken(refreshToken);

			if (sessionData) {
				await db
					.update(session)
					.set({ revokedAt: new Date() })
					.where(eq(session.id, sessionData.id));
			}
		}

		clearAuthCookies(context.honoContext);

		return {
			success: true,
		};
	}),

	me: protectedProcedure.handler(async ({ context }) => {
		const [userData] = await db
			.select()
			.from(user)
			.where(eq(user.id, context.auth.userId));

		if (!userData) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Người dùng không tồn tại",
			});
		}

		if (userData.status !== "active") {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Tài khoản đã bị khóa",
			});
		}

		// `me` chỉ xác nhận danh tính hiện tại.
		// Authorization data nên được resolve ở lớp riêng sau này.
		return {
			user: toAuthUserProfile(userData),
		};
	}),
};
