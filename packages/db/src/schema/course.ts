import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { department } from "./department";
import { originalCourse } from "./originalCourse";

export const course = pgTable("courses", {
    id: serial("id").primaryKey(),
    originalCourseId: integer("original_course_id").notNull().references(() => originalCourse.id, { onDelete: "restrict" }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    lectureCredits: integer("lecture_credits").notNull(),
    practiceCredits: integer("practice_credits").notNull(),
    departmentId: integer("department_id").notNull().references(() => department.id, { onDelete: "cascade" }),
    lectureSessions: integer("lecture_sessions").notNull(),
    practiceSessions: integer("practice_sessions").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
