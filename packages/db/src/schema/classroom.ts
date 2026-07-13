import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { building } from "./building";

export const classroom = pgTable("classrooms", {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    buildingId: integer("building_id").notNull().references(() => building.id, { onDelete: "cascade" }),
    capacity: integer("capacity").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})