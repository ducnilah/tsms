import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { studentClass } from "./studentClass";
import { program } from "./program";


export const student = pgTable("students", {
    id: serial("id").primaryKey(),
    studentCode: text("student_code").notNull().unique(),
    name: text("name").notNull(),
    dob: timestamp("dob").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull().unique(),
    classId: integer("class_id").notNull().references(() => studentClass.id),
    programId: integer("program_id").notNull().references(() => program.id),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})