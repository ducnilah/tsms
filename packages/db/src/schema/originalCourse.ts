import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { department } from "./department";

export const originalCourse = pgTable("original_courses", {
	id: serial("id").primaryKey(),
	code: text("code").notNull().unique(),
	name: text("name").notNull(),
	lectureCredits: numeric("lecture_credits", { precision: 3, scale: 1, mode: "number" }).notNull(),
	practiceCredits: numeric("practice_credits", { precision: 3, scale: 1, mode: "number" }).notNull(),
	departmentId: integer("department_id").notNull().references(() => department.id, { onDelete: "cascade" }),
	lectureSessions: integer("lecture_sessions").notNull(),
	practiceSessions: integer("practice_sessions").notNull(),
	description: text("description"),
	status: text("status").notNull().default("active"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
