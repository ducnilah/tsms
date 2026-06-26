import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const faculty = pgTable("faculty", {
        id: serial("id").primaryKey(),
        code: text("code").notNull(),
        name: text("name").notNull(),
        description: text("description").notNull(),
        status: text("status").notNull().default("active"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
})