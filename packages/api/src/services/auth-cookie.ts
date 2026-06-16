import type { Context as HonoContext } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { env } from "@tsms/env/server";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

const baseCookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
}

export function setAuthCookies(
    context: HonoContext,
    params: {
        accessToken: string;
        refreshToken: string;
    },
) {
    setCookie(context, ACCESS_TOKEN_COOKIE, params.accessToken, {
        ...baseCookieOptions,
        maxAge: ACCESS_TOKEN_MAX_AGE,
    });
}

export function setAccessTokenCookie(
    context: HonoContext,
    accessToken: string,
) {
    setCookie(context, ACCESS_TOKEN_COOKIE, accessToken, {
        ...baseCookieOptions,
        maxAge: ACCESS_TOKEN_MAX_AGE,
    });
}

export function clearAuthCookies(context: HonoContext) {
    deleteCookie(context, ACCESS_TOKEN_COOKIE, {
        path: "/",
    });
    deleteCookie(context, REFRESH_TOKEN_COOKIE, {
        path: "/",
    });
}

export function getAccessTokenFromCookie(context: HonoContext) {
    return getCookie(context, ACCESS_TOKEN_COOKIE);
}

export function getRefreshTokenFromCookie(context: HonoContext) {
    return getCookie(context, REFRESH_TOKEN_COOKIE);
}