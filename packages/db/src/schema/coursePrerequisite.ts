import { integer, pgTable , serial, timestamp } from "drizzle-orm/pg-core";
import { course } from "./course";

export const coursePrerequisite = pgTable("course_prerequisites", {
    id: serial("id").primaryKey(),
    courseId: integer("course_id").notNull().references(() => course.id),
    prerequisiteCourseId: integer("prerequisite_id").notNull().references(() => course.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});