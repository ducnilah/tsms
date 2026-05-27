import { z } from "zod";
import { publicProcedure } from "../index";
import { db } from "@tsms/db";
import { user } from "@tsms/db/schema/user";
import { eq } from "drizzle-orm";
import { authService } from "../services/auth";

const loginSchema = z.object({
    email: z.email("Vui lòng nhập email hợp lệ"),
    password: z.string(),
});

const registerSchema = z.object({
    username: z.string(),
    email: z.email("Vui lòng nhập email hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có độ dài ít nhất 6 ký tự")
});

export const authRouter = {
    login: publicProcedure
        .input(loginSchema)
        .handler(async ({ input }) => {
            const [userData] = await db.select().from(user).where(eq(user.email, input.email));

            if (!userData) {
                throw new Error("Email hoặc mật khẩu không đúng");
            }

            const isPasswordValid = await authService.comparePassword(input.password, userData.hashedPassword);

            if (!isPasswordValid) {
                throw new Error("Email hoặc mật khẩu không đúng");
            }

            const token = await authService.generateToken(userData.id, userData.email);

            return {
                token,
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
                throw new Error("Email đã được sử dụng");
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
                throw new Error("Không thể tạo tài khoản");
            }

            const token = await authService.generateToken(newUser.id, newUser.email);

            return {
                token,
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