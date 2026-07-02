import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { course } from "./course";
import { program } from "./program";

export const programCourse = pgTable("program_courses", {
    id: serial("id").primaryKey(),
    programId: integer("program_id").notNull().references(() => program.id),
    courseId: integer("course_id").notNull().references(() => course.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    semesterNo: integer("semester_no").notNull(),
    isRequired: integer("is_required").notNull().default(1),
})