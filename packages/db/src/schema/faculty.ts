import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const faculty = pgTable("faculties", {
        id: serial("id").primaryKey(),
        code: text("code").notNull().unique(),
        name: text("name").notNull(),
        description: text("description").notNull(),
        status: text("status").notNull().default("active"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
