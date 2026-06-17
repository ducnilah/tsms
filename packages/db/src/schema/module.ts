import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const module = pgTable("modules", {
    id: serial("id").primaryKey(),
    moduleKey: text("module_key").notNull().unique(),
    moduleName: text("module_name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
