import type { Context as HonoContext } from "hono";
import { db } from "@tsms/db";
import { session } from "@tsms/db/schema/session";

import {
	getAccessTokenFromCookie,
	getRefreshTokenFromCookie,
} from "./services/auth-cookie";
import { authService } from "./services/auth";

export type CreateContextOptions = {
	context: HonoContext;
};

export type AuthUser = {
	userId: number;
	email: string;
};

export type SessionData = typeof session.$inferSelect;

async function findValidSessionByRefreshToken(
	refreshToken: string,
): Promise<SessionData | null> {
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
}

export async function createContext(options: CreateContextOptions) {
	const { context } = options;

	let auth: AuthUser | null = null;
	let sessionData: SessionData | null = null;

	const accessToken = getAccessTokenFromCookie(context);
	const refreshToken = getRefreshTokenFromCookie(context);

	if (refreshToken) {
		sessionData = await findValidSessionByRefreshToken(refreshToken);
	}

	if (accessToken) {
		const verifiedToken = await authService.verifyAccessToken(accessToken);

		if (verifiedToken) {
			auth = {
				userId: verifiedToken.userId,
				email: verifiedToken.email,
			};
		}
	}

	return {
		auth,
		honoContext: context,
		session: sessionData,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
