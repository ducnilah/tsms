import { integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { permission } from "./permission";
import { role } from "./role";

export const rolePermission = pgTable(
    "roles_permissions",
    {
        roleId: integer("role_id")
            .notNull()
            .references(() => role.id, { onDelete: "cascade" }),
        permissionId: integer("permission_id")
            .notNull()
            .references(() => permission.id, { onDelete: "cascade" }),
        value: integer("value")
            .notNull(),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
    }),
);
