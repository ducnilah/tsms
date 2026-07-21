import { pgTable, serial, text, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { department } from "./department";
import { originalCourse } from "./originalCourse";

export const course = pgTable("courses", {
    id: serial("id").primaryKey(),
    originalCourseId: integer("original_course_id").notNull().references(() => originalCourse.id, { onDelete: "restrict" }),
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
