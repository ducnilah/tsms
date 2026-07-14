import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { academicYear } from "./academicYear";

export const academicHoliday = pgTable("academic_holidays", {
    id: serial("id").primaryKey(),
    academicYearId: integer("academic_year_id").notNull().references(() => academicYear.id, { onDelete: "cascade" }),
    semesterId: integer("semester_id").notNull().references(() => academicYear.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})