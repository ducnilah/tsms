import { pgTable, serial, text, integer, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { semester } from "./semester";

export const semesterWeek = pgTable("semester_weeks", {
    id: serial("id").primaryKey(),
    semesterId: integer("semester_id").notNull().references(() => semester.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isTeachingWeek: boolean("is_teaching_week").notNull().default(true),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})