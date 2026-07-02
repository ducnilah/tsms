import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { department } from "./department";

export const program = pgTable("programs", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    departmentId: integer("department_id").notNull().references(() => department.id),
    totalCredits: integer("total_credits").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})