import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    hashedPassword: text("hashed_password").notNull(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
})