import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const building = pgTable("buildings", {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})