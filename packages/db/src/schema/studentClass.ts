import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { faculty } from "./faculty";

export const studentClass = pgTable("student_classes", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    facultyId: integer("faculty_id").notNull().references(() => faculty.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
