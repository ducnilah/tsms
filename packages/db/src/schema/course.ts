import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { department } from "./department";

export const course = pgTable("courses", {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    credits: integer("credits").notNull(),
    departmentId: integer("department_id").notNull().references(() => department.id, { onDelete: "cascade" }),
    lectureSessions: integer("lecture_sessions").notNull(),
    labSessions: integer("lab_sessions").notNull(),
    practiceSessions: integer("practice_sessions").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});