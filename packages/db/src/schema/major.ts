import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { faculty } from "./faculty";

export const major = pgTable("majors", {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    facultyId: integer("faculty_id").notNull().references(() => faculty.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
