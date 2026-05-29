import { z } from "zod";
import { publicProcedure } from "../index";
import { db } from "@tsms/db";
import { user } from "@tsms/db/schema/user";
import { eq } from "drizzle-orm";
import { authService } from "../services/auth";
import { ORPCError } from "@orpc/server";
import { session } from "@tsms/db/schema/session";

const loginSchema = z.object({
    email: z.email("Vui long nhap email hop le"),
    password: z.string(),
});

const registerSchema = z.object({
    username: z.string(),
    email: z.email("Vui long nhap email hop le"),
    password: z.string().min(6, "Mat khau phai co it nhat 6 ky tu"),
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
};

export const authRouter = {
    login: publicProcedure
        .input(loginSchema)
        .handler(async ({ input }) => {
            const [userData] = await db.select().from(user).where(eq(user.email, input.email));

            if (!userData) {
                throw new ORPCError("UNAUTHORIZED", {
                    message: "Email hoac mat khau khong dung",
                });
            }

            const isPasswordValid = await authService.comparePassword(input.password, userData.hashedPassword);

            if (!isPasswordValid) {
                throw new ORPCError("UNAUTHORIZED", {
                    message: "Email hoac mat khau khong dung",
                });
            }

            return authResponse(userData);
        }),
    
    register: publicProcedure
        .input(registerSchema)
        .handler(async ({ input }) => {
            const [existingUser] = await db.select().from(user).where(eq(user.email, input.email));

            if (existingUser) {
                throw new ORPCError("CONFLICT", {
                    message: "Email da duoc su dung"
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
                    message: "Khong the tao tai khoan"
                });
            }

            return authResponse(newUser);
        })
}
