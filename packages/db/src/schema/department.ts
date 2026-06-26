import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { faculty } from "./faculty";

export const department = pgTable("department", { 
    id: serial("id").primaryKey(),
    facultyId: serial("faculty_id").notNull().references(() => faculty.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})