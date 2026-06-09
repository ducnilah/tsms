import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { session } from "@tsms/db/schema/session";
import { user } from "@tsms/db/schema/user";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";
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

const refreshSchema = z.object({
	refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
	refreshToken: z.string().min(1),
});

const refreshTokenExpiresIn = 7 * 24 * 60 * 60;

const authResponse = async (userData: typeof user.$inferSelect) => {
	const refreshToken = authService.generateRefreshToken();
	const hashedRefreshToken = await authService.hashRefreshToken(refreshToken);

	await db.insert(session).values({
		userId: userData.id,
		refreshToken: hashedRefreshToken,
		expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
	});

	const accessToken = await authService.generateAccessToken(
		userData.id,
		userData.email,
	);

	return {
		accessToken,
		refreshToken,
		user: {
			id: userData.id,
			username: userData.username,
			email: userData.email,
			status: userData.status,
			createdAt: userData.createdAt,
		},
	};
};

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
	login: publicProcedure.input(loginSchema).handler(async ({ input }) => {
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

		return authResponse(userData);
	}),

	register: publicProcedure.input(registerSchema).handler(async ({ input }) => {
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
				hashedPassword: hashedPassword,
				status: "active",
			})
			.returning();

		if (!newUser) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Không thể tạo tài khoản",
			});
		}

		return authResponse(newUser);
	}),

	refresh: publicProcedure.input(refreshSchema).handler(async ({ input }) => {
		const sessionData = await findValidSessionByRefreshToken(
			input.refreshToken,
		);

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

		const accessToken = await authService.generateAccessToken(
			userData.id,
			userData.email,
		);

		return {
			accessToken,
		};
	}),

	logout: publicProcedure.input(logoutSchema).handler(async ({ input }) => {
		const sessionData = await findValidSessionByRefreshToken(
			input.refreshToken,
		);

		if (!sessionData) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Refresh token không hợp lệ hoặc đã hết hạn",
			});
		}

		await db
			.update(session)
			.set({ revokedAt: new Date() })
			.where(eq(session.id, sessionData.id));

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

		return {
			user: {
				id: userData.id,
				username: userData.username,
				email: userData.email,
				status: userData.status,
				createdAt: userData.createdAt,
			},
		};
	}),
};
