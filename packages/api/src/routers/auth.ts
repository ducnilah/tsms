import { z } from "zod";
import { publicProcedure } from "../index";
import { db } from "@tsms/db";
import { user } from "@tsms/db/schema/user";
import { eq } from "drizzle-orm";
import { authService } from "../services/auth";
import { ORPCError } from "@orpc/server";
import { session } from "@tsms/db/schema/session";

const loginSchema = z.object({
    email: z.email("Vui lòng nhập email hợp lệ"),
    password: z.string(),
});

const registerSchema = z.object({
    username: z.string(),
    email: z.email("Vui lòng nhập email hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export const authRouter = {
    login: publicProcedure
        .input(loginSchema)
        .handler(async ({ input }) => {
            const [userData] = await db.select().from(user).where(eq(user.email, input.email));

            if (!userData) {
                throw new ORPCError("UNAUTHORIZED", {
                    message: "Email hoặc mật khẩu không đúng",
                });
            }

            const isPasswordValid = await authService.comparePassword(input.password, userData.hashedPassword);

            if (!isPasswordValid) {
                throw new ORPCError("UNAUTHORIZED", {
                    message: "Email hoặc mật khẩu không đúng",
                });
            }

            const refreshTokenExpiresIn = 7 * 24 * 60 * 60;
            const refreshToken = authService.generateRefreshToken();
            const hashedRefreshToken = await authService.hashRefreshToken(refreshToken);

            await db.insert(session).values({
                userId: userData.id,
                refreshToken: hashedRefreshToken,
                expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
            });

            const accessToken = await authService.generateAccessToken(userData.id, userData.email);

            return {
                accessToken,
                refreshToken,
                user: {
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    status: userData.status,
                    createdAt: userData.createdAt,
                }
            };

        }),
    
    register: publicProcedure
        .input(registerSchema)
        .handler(async ({ input }) => {
            const [existingUser] = await db.select().from(user).where(eq(user.email, input.email));

            if (existingUser) {
                throw new ORPCError("CONFLICT", {
                    message: "Email đã được sử dụng"
                });
            }

            const hashedPassword = await authService.hashPassword(input.password);

            const [newUser] = await db.insert(user).values({
                username: input.username,
                email: input.email,
                hashedPassword: hashedPassword,
                status: "active",
            })
            .returning();

            if (!newUser) {
                throw new ORPCError("INTERNAL_SERVER_ERROR", {
                    message: "Không thể tạo tài khoản"
                });
            }

            const refreshTokenExpiresIn = 7 * 24 * 60 * 60;
            const refreshToken = authService.generateRefreshToken();
            const hashedRefreshToken = await authService.hashRefreshToken(refreshToken);

            await db.insert(session).values({
                userId: newUser.id,
                refreshToken: hashedRefreshToken,
                expiresAt: new Date(Date.now() + refreshTokenExpiresIn * 1000),
            });

            const accessToken = await authService.generateAccessToken(newUser.id, newUser.email);

            return {
                accessToken,
                refreshToken,
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    status: newUser.status,
                    createdAt: newUser.createdAt,
                }
            };
        })
}