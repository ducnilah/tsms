import type { Context as HonoContext } from "hono";
import { session } from "@tsms/db/schema/session";
import { getAccessTokenFromCookie } from "./services/auth-cookie";
import { authService } from "./services/auth";

export type CreateContextOptions = {
  context: HonoContext;
};

// type cho user info từ JWT
export type AuthUser = {
  userId: number;
  email: string;
}

// type cho session data từ DB
export type SessionData = typeof session.$inferSelect;

export async function createContext(_options: CreateContextOptions) {
  const { context } = _options;

  let auth: AuthUser | null = null;

  const accessToken = getAccessTokenFromCookie(context);

  if(accessToken) {
    const verifiedToken = await authService.verifyAccessToken(accessToken);
    if(verifiedToken) {
      auth = {
        userId: verifiedToken.userId,
        email: verifiedToken.email,
      };
    }
  }
  return {
    auth,
    honoContext: context,
    session: null as SessionData | null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
