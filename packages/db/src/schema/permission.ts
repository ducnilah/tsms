import { integer, pgTable, serial, timestamp, text } from "drizzle-orm/pg-core";

export const permission = pgTable(
    "permissions",
    {
        id: serial("id").primaryKey(),
        key: text("key").notNull(),
        name: text("name").notNull(),
        bitValue: integer("bit_value").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
);