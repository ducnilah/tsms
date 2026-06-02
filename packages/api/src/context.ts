import type { Context as HonoContext } from "hono";
import { session } from "@tsms/db/schema/session";
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

  const authHeader = context.req.header("Authorization");
  if(authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const verified = await authService.verifyAccessToken(token);

    if(verified) {
      auth = {
        userId: verified.userId,
        email: verified.email,
      }
    }
  }

  return {
    auth,
    session: null as SessionData | null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
