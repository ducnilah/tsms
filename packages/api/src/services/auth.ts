import { hash, compare } from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "@tsms/env/server";

export class AuthService {
    async hashPassword(password: string): Promise<string> {
        return await hash(password, 10);
    }

    async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return await compare(password, hashedPassword);
    }

    async generateAccessToken(userId: number, email: string ): Promise<string> {
        return jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: "15m" });
    }

    generateRefreshToken(): string {
        return crypto.randomBytes(64).toString("hex");
    }

    async hashRefreshToken(refreshToken: string): Promise<string> {
        return await hash(refreshToken, 10);
    }

    async compareRefreshToken(refreshToken: string, hashedRefreshToken: string): Promise<boolean> {
        return await compare(refreshToken, hashedRefreshToken);
    }

    async verifyToken(token: string): Promise<{ userId: number; email: string } | null> {
        try {
            return jwt.verify(token, env.JWT_SECRET) as { userId: number; email: string };
        } catch (error) {
            console.error("Invalid token:", error);
            return null;
        }
    }
}

export const authService = new AuthService();
