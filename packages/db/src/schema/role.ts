import { pgTable, text, serial } from "drizzle-orm/pg-core";

export const role = pgTable("roles", {
    id: serial("id").primaryKey(),
    role_name: text("role_name").notNull(),
    description: text("description").notNull(),
})