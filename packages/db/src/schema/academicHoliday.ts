import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { academicYear } from "./academicYear";
import { semester } from "./semester";

export const academicHoliday = pgTable("academic_holidays", {
    id: serial("id").primaryKey(),
    academicYearId: integer("academic_year_id").notNull().references(() => academicYear.id, { onDelete: "cascade" }),
    semesterId: integer("semester_id").references(() => semester.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})