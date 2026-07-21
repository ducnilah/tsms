import { date, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { department } from "./department";

export const lecturer = pgTable("lecturers", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    dob: date("dob").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull().unique(),
    departmentId: integer("department_id").notNull().references(() => department.id, { onDelete: "cascade" }),
    position: text("position").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    departmentStatusIdx: index("lecturers_department_status_idx").on(
        table.departmentId,
        table.status,
    ),
    statusIdx: index("lecturers_status_idx").on(table.status),
}))
