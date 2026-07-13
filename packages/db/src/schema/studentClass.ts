import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { faculty } from "./faculty";
import { major } from "./major";
import { program } from "./program";

export const studentClass = pgTable("student_classes", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    facultyId: integer("faculty_id").notNull().references(() => faculty.id),
    majorId: integer("major_id").notNull().references(() => major.id),
    programId: integer("program_id").notNull().references(() => program.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
