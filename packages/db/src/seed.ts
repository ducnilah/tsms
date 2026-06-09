import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hash } from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

import * as schema from "./schema/index.js";
import { role } from "./schema/role.js";
import { user } from "./schema/user.js";
import { userRole } from "./schema/userRole.js";

// Load .env từ apps/server/.env (giống drizzle.config.ts)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../apps/server/.env") });

const db = drizzle(process.env.DATABASE_URL!, { schema });

// ──────────────────────────────────────────────
// Dữ liệu seed
// ──────────────────────────────────────────────

const ROLES = [
  { role_name: "admin",   description: "Quản trị hệ thống toàn quyền" },
  { role_name: "dean",    description: "Trưởng khoa / Bộ môn" },
  { role_name: "teacher", description: "Giảng viên" },
];

const SEED_USERS = [
  {
    username: "admin",
    email:    "admin@tsms.edu.vn",
    password: "Admin@123456",
    roleName: "admin",
  },
  {
    username: "dean",
    email:    "dean@tsms.edu.vn",
    password: "Dean@123456",
    roleName: "dean",
  },
  {
    username: "teacher",
    email:    "teacher@tsms.edu.vn",
    password: "Teacher@123456",
    roleName: "teacher",
  },
];

// ──────────────────────────────────────────────
// Helper: upsert role (insert nếu chưa có)
// ──────────────────────────────────────────────
async function upsertRole(data: (typeof ROLES)[number]) {
  const [existing] = await db
    .select()
    .from(role)
    .where(eq(role.role_name, data.role_name));

  if (existing) {
    console.log(`  [SKIP] Role "${data.role_name}" đã tồn tại (id=${existing.id})`);
    return existing;
  }

  const [inserted] = await db.insert(role).values(data).returning();
  console.log(`  [OK]   Role "${inserted.role_name}" đã được tạo (id=${inserted.id})`);
  return inserted;
}

// ──────────────────────────────────────────────
// Helper: upsert user + gán role
// ──────────────────────────────────────────────
async function upsertUser(
  data: (typeof SEED_USERS)[number],
  roleId: number,
) {
  // 1. Kiểm tra user đã tồn tại chưa (theo email hoặc username — cả hai đều unique)
  const [existingByEmail] = await db
    .select()
    .from(user)
    .where(eq(user.email, data.email));

  const [existingByUsername] = await db
    .select()
    .from(user)
    .where(eq(user.username, data.username));

  const existing = existingByEmail ?? existingByUsername;

  let userId: number;

  // 2. Hash password bằng bcryptjs (cost factor 10, giống AuthService)
  const hashedPassword = await hash(data.password, 10);

  if (existing) {
    // Luôn reset password + đảm bảo status active cho seed user
    await db
      .update(user)
      .set({ hashedPassword, status: "active" })
      .where(eq(user.id, existing.id));
    console.log(`  [SYNC] User "${data.email}" đã tồn tại → reset password + active (id=${existing.id})`);
    userId = existing.id;
  } else {
    const [inserted] = await db
      .insert(user)
      .values({
        username:       data.username,
        email:          data.email,
        hashedPassword,
        status:         "active",
      })
      .returning();

    console.log(`  [OK]   User "${inserted.email}" đã được tạo (id=${inserted.id})`);
    userId = inserted.id;
  }

  // 3. Gán role nếu chưa có
  const [existingRole] = await db
    .select()
    .from(userRole)
    .where(eq(userRole.userId, userId));

  if (existingRole) {
    console.log(`  [SKIP] User id=${userId} đã có role, bỏ qua gán role`);
  } else {
    await db.insert(userRole).values({ userId, roleId });
    console.log(`  [OK]   Gán role id=${roleId} cho user id=${userId}`);
  }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log("\n🌱 Bắt đầu seed dữ liệu...\n");

  // ── Bước 1: Seed roles ──────────────────────
  console.log("── Roles ──────────────────────────────────");
  const roleMap: Record<string, number> = {};

  for (const r of ROLES) {
    const inserted = await upsertRole(r);
    roleMap[inserted.role_name] = inserted.id;
  }

  // ── Bước 2: Seed users ──────────────────────
  console.log("\n── Users ──────────────────────────────────");
  for (const u of SEED_USERS) {
    const roleId = roleMap[u.roleName];
    if (!roleId) {
      console.error(`  [ERR]  Không tìm thấy role "${u.roleName}", bỏ qua user "${u.email}"`);
      continue;
    }
    await upsertUser(u, roleId);
  }

  console.log("\n✅ Seed hoàn tất!\n");
  console.log("Tài khoản seed:");
  console.log("  admin@tsms.edu.vn   / Admin@123456   (admin)");
  console.log("  dean@tsms.edu.vn    / Dean@123456    (dean)");
  console.log("  teacher@tsms.edu.vn / Teacher@123456 (teacher)");
  console.log();

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Seed thất bại:", err);
  process.exit(1);
});
