import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { module } from "./module";

export const permission = pgTable(
    "permissions",
    {
        id: serial("id").primaryKey(),
        moduleId: integer("module_id")
            .notNull()
            .references(() => module.id, { onDelete: "cascade" }),
        actionKey: text("action_key").notNull(),
        bitValue: integer("bit_value").notNull(),
        permissionKey: text("permission_key").notNull().unique(),
        label: text("label").notNull(),
        description: text("description"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
        moduleActionUnique: unique("permissions_module_action_unique").on(
            table.moduleId,
            table.actionKey,
        ),
        moduleBitUnique: unique("permissions_module_bit_unique").on(
            table.moduleId,
            table.bitValue,
        ),
    }),
);
