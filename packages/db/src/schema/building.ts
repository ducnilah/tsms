import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const building = pgTable("buildings", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})