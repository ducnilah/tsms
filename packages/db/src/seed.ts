import dotenv from "dotenv";
import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "./schema/index.js";
import { module as appModule } from "./schema/module.js";
import { permission } from "./schema/permission.js";
import { role } from "./schema/role.js";
import { rolePermission } from "./schema/rolePermission.js";
import { user } from "./schema/user.js";
import { userRole } from "./schema/userRole.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../apps/server/.env") });

const db = drizzle(process.env.DATABASE_URL!, { schema });

const ROLES = [
  { role_name: "admin", description: "Quan tri he thong toan quyen" },
  { role_name: "dean", description: "Truong khoa / Bo mon" },
  { role_name: "teacher", description: "Giang vien" },
] as const;

const SEED_USERS = [
  {
    username: "admin",
    email: "admin@tsms.edu.vn",
    password: "Admin@123456",
    roleName: "admin",
  },
  {
    username: "dean",
    email: "dean@tsms.edu.vn",
    password: "Dean@123456",
    roleName: "dean",
  },
  {
    username: "teacher",
    email: "teacher@tsms.edu.vn",
    password: "Teacher@123456",
    roleName: "teacher",
  },
] as const;

const MODULES = [
  {
    moduleKey: "users",
    moduleName: "Quan ly nguoi dung",
    description: "Quan ly tai khoan va gan vai tro",
    sortOrder: 10,
  },
  {
    moduleKey: "roles",
    moduleName: "Quan ly vai tro",
    description: "Tao vai tro va cap quyen",
    sortOrder: 20,
  },
  {
    moduleKey: "schedules",
    moduleName: "Lich day",
    description: "Quan ly va tra cuu lich day",
    sortOrder: 30,
  },
  {
    moduleKey: "rooms",
    moduleName: "Phong hoc",
    description: "Quan ly phong hoc",
    sortOrder: 40,
  },
  {
    moduleKey: "reports",
    moduleName: "Bao cao",
    description: "Xem va xuat bao cao",
    sortOrder: 50,
  },
] as const;

const CRUD_ACTIONS = [
  { actionKey: "create", bitValue: 1, label: "Tao" },
  { actionKey: "read", bitValue: 2, label: "Xem" },
  { actionKey: "update", bitValue: 4, label: "Sua" },
  { actionKey: "delete", bitValue: 8, label: "Xoa" },
] as const;

async function upsertRole(data: (typeof ROLES)[number]) {
  const [existing] = await db
    .select()
    .from(role)
    .where(eq(role.role_name, data.role_name));

  if (existing) {
    console.log(`  [SKIP] Role "${data.role_name}" already exists (id=${existing.id})`);
    return existing;
  }

  const [inserted] = await db.insert(role).values(data).returning();
  console.log(`  [OK]   Created role "${inserted.role_name}" (id=${inserted.id})`);
  return inserted;
}

async function upsertModule(data: (typeof MODULES)[number]) {
  const [existing] = await db
    .select()
    .from(appModule)
    .where(eq(appModule.moduleKey, data.moduleKey));

  if (existing) {
    console.log(`  [SKIP] Module "${data.moduleKey}" already exists (id=${existing.id})`);
    return existing;
  }

  const [inserted] = await db
    .insert(appModule)
    .values({
      moduleKey: data.moduleKey,
      moduleName: data.moduleName,
      description: data.description,
      sortOrder: data.sortOrder,
      isActive: true,
    })
    .returning();

  console.log(`  [OK]   Created module "${inserted.moduleKey}" (id=${inserted.id})`);
  return inserted;
}

async function upsertPermission(params: {
  moduleId: number;
  moduleKey: string;
  actionKey: string;
  bitValue: number;
  label: string;
}) {
  const permissionKey = `${params.moduleKey}.${params.actionKey}`;

  const [existing] = await db
    .select()
    .from(permission)
    .where(eq(permission.permissionKey, permissionKey));

  if (existing) {
    console.log(`  [SKIP] Permission "${permissionKey}" already exists (id=${existing.id})`);
    return existing;
  }

  const [inserted] = await db
    .insert(permission)
    .values({
      moduleId: params.moduleId,
      actionKey: params.actionKey,
      bitValue: params.bitValue,
      permissionKey,
      label: params.label,
      description: `${params.label} in module ${params.moduleKey}`,
    })
    .returning();

  console.log(`  [OK]   Created permission "${inserted.permissionKey}" (id=${inserted.id})`);
  return inserted;
}

async function assignAllPermissionsToAdminRole() {
  const [adminRole] = await db
    .select()
    .from(role)
    .where(eq(role.role_name, "admin"));

  if (!adminRole) {
    console.log('  [SKIP] Role "admin" not found, skip permission assignment');
    return;
  }

  const allPermissions = await db.select().from(permission);

  for (const item of allPermissions) {
    const [existing] = await db
      .select()
      .from(rolePermission)
      .where(
        and(
          eq(rolePermission.roleId, adminRole.id),
          eq(rolePermission.permissionId, item.id),
        ),
      );

    if (existing) {
      continue;
    }

    await db.insert(rolePermission).values({
      roleId: adminRole.id,
      permissionId: item.id,
    });
  }

  console.log(`  [OK]   Granted ${allPermissions.length} permissions to role "admin"`);
}

async function upsertUser(data: (typeof SEED_USERS)[number], roleId: number) {
  const [existingByEmail] = await db
    .select()
    .from(user)
    .where(eq(user.email, data.email));

  const [existingByUsername] = await db
    .select()
    .from(user)
    .where(eq(user.username, data.username));

  const existing = existingByEmail ?? existingByUsername;
  const hashedPassword = await hash(data.password, 10);

  let userId: number;

  if (existing) {
    await db
      .update(user)
      .set({ hashedPassword, status: "active" })
      .where(eq(user.id, existing.id));

    console.log(`  [SYNC] Updated user "${data.email}" and kept it active (id=${existing.id})`);
    userId = existing.id;
  } else {
    const [inserted] = await db
      .insert(user)
      .values({
        username: data.username,
        email: data.email,
        hashedPassword,
        status: "active",
      })
      .returning();

    console.log(`  [OK]   Created user "${inserted.email}" (id=${inserted.id})`);
    userId = inserted.id;
  }

  const [existingUserRole] = await db
    .select()
    .from(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)));

  if (existingUserRole) {
    console.log(`  [SKIP] User id=${userId} already has role id=${roleId}`);
    return;
  }

  await db.insert(userRole).values({ userId, roleId });
  console.log(`  [OK]   Assigned role id=${roleId} to user id=${userId}`);
}

async function seedModulesAndPermissions() {
  console.log("\n-- Modules --------------------------------");
  const moduleMap: Record<string, number> = {};

  for (const item of MODULES) {
    const inserted = await upsertModule(item);
    moduleMap[inserted.moduleKey] = inserted.id;
  }

  console.log("\n-- Permissions ----------------------------");
  for (const item of MODULES) {
    const moduleId = moduleMap[item.moduleKey];

    for (const action of CRUD_ACTIONS) {
      await upsertPermission({
        moduleId,
        moduleKey: item.moduleKey,
        actionKey: action.actionKey,
        bitValue: action.bitValue,
        label: action.label,
      });
    }
  }

  console.log("\n-- Role Permissions -----------------------");
  await assignAllPermissionsToAdminRole();
}

async function main() {
  console.log("\nStarting seed...\n");

  console.log("-- Roles ----------------------------------");
  const roleMap: Record<string, number> = {};

  for (const item of ROLES) {
    const inserted = await upsertRole(item);
    roleMap[inserted.role_name] = inserted.id;
  }

  await seedModulesAndPermissions();

  console.log("\n-- Users ----------------------------------");
  for (const item of SEED_USERS) {
    const roleId = roleMap[item.roleName];

    if (!roleId) {
      console.error(`  [ERR]  Missing role "${item.roleName}" for user "${item.email}"`);
      continue;
    }

    await upsertUser(item, roleId);
  }

  console.log("\nSeed completed.\n");
  console.log("Seed accounts:");
  console.log("  admin@tsms.edu.vn   / Admin@123456   (admin)");
  console.log("  dean@tsms.edu.vn    / Dean@123456    (dean)");
  console.log("  teacher@tsms.edu.vn / Teacher@123456 (teacher)");
  console.log();

  process.exit(0);
}

main().catch((error) => {
  console.error("\nSeed failed:", error);
  process.exit(1);
});
