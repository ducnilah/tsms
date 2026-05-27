import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./user";
import { role } from "./role";

export const userRole = pgTable(
    "users_roles", 
    {
        userId: integer("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        roleId: integer("role_id")
            .notNull()
            .references(() => role.id, { onDelete: "cascade" }),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.userId, table.roleId] }),
    })
)