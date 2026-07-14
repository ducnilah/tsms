import { pgTable, serial, text, integer, timestamp, boolean, date } from "drizzle-orm/pg-core";;
import { academicYear } from "./academicYear";

export const semester = pgTable("semester", {
    id: serial("id").primaryKey(),
    academicYearId: integer("academic_year_id").notNull().references(() => academicYear.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    type: text("type").notNull().default("regular"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})