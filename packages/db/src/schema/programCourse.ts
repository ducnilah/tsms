import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { course } from "./course";
import { program } from "./program";

export const programCourse = pgTable("program_courses", {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull().references(() => program.id),
    courseId: integer("course_id").notNull().references(() => course.id),
    semesterNo: integer("semester_no").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    isRequired: integer("is_required").notNull().default(1), // 1: required, 0: elective
})