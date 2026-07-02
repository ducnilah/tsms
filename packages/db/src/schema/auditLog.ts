import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { user } from "./user";

export const auditLog = pgTable(
    "audit_logs",
    {
        id: serial("id").primaryKey(),
        user_id: integer("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
        action: text("action").notNull(),
        table_name: text("table_name").notNull(),
        record_id: text("record_id").notNull(),
        old_values: text("old_values"),
        new_values: text("new_values"),
        timestamp: timestamp("timestamp").defaultNow().notNull(),
    }
)