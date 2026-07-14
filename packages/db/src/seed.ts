import { hash } from "bcryptjs";
import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "./schema/index.js";
import { permission } from "./schema/permission.js";
import { role } from "./schema/role.js";
import { rolePermission } from "./schema/rolePermission.js";
import { user } from "./schema/user.js";
import { userRole } from "./schema/userRole.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../apps/server/.env") });

const db = drizzle(process.env.DATABASE_URL!, { schema });

const ROLES = [
	{ role_name: "admin", description: "Quản trị hệ thống toàn quyền" },
	{ role_name: "dean", description: "Trưởng khoa / Bộ môn" },
	{ role_name: "teacher", description: "Giảng viên" },
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

const SEED_PERMISSIONS = [
	{ key: "users", name: "Quản lý người dùng", bitValue: 15 },
	{ key: "roles", name: "Quản lý vai trò", bitValue: 15 },
	{ key: "faculties", name: "Quản lý khoa", bitValue: 15 },
	{ key: "departments", name: "Quản lý bộ môn", bitValue: 15 },
	{ key: "lecturers", name: "Quản lý giảng viên", bitValue: 15 },
] as const;

const ACADEMIC_CALENDAR_PERMISSIONS = [
	{ key: "academic-years", name: "Quản lý năm học", bitValue: 15 },
	{ key: "semesters", name: "Quản lý học kỳ", bitValue: 15 },
	{ key: "semester-weeks", name: "Quản lý tuần học", bitValue: 15 },
	{ key: "academic-holidays", name: "Quản lý ngày nghỉ/lễ", bitValue: 15 },
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

	if (!inserted) {
		throw new Error(`Failed to create role "${data.role_name}"`);
	}

	console.log(`  [OK]   Created role "${inserted.role_name}" (id=${inserted.id})`);
	return inserted;
}

async function upsertPermission(data: { key: string; name: string; bitValue: number }) {
	const [existing] = await db
		.select()
		.from(permission)
		.where(eq(permission.key, data.key));

	if (existing) {
		await db
			.update(permission)
			.set({
				name: data.name,
				bitValue: data.bitValue,
			})
			.where(eq(permission.id, existing.id));

		console.log(`  [SYNC] Updated permission "${data.key}" (id=${existing.id})`);
		return existing;
	}

	const [inserted] = await db.insert(permission).values(data).returning();

	if (!inserted) {
		throw new Error(`Failed to create permission "${data.key}"`);
	}

	console.log(`  [OK]   Created permission "${inserted.key}" (id=${inserted.id})`);
	return inserted;
}

async function grantAdminFullPermissions(adminRoleId: number) {
	const permissions = await db.select().from(permission);

	for (const item of permissions) {
		const [existing] = await db
			.select()
			.from(rolePermission)
			.where(
				and(
					eq(rolePermission.roleId, adminRoleId),
					eq(rolePermission.permissionId, item.id),
				),
			);

		if (existing) {
			await db
				.update(rolePermission)
				.set({ value: item.bitValue })
				.where(
					and(
						eq(rolePermission.roleId, adminRoleId),
						eq(rolePermission.permissionId, item.id),
					),
				);
			continue;
		}

		await db.insert(rolePermission).values({
			roleId: adminRoleId,
			permissionId: item.id,
			value: item.bitValue,
		});
	}

	console.log(`  [OK]   Granted full permissions to admin role id=${adminRoleId}`);
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

		if (!inserted) {
			throw new Error(`Failed to create user "${data.email}"`);
		}

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

async function main() {
	console.log("\nStarting seed...\n");

	console.log("-- Roles ----------------------------------");
	const roleMap: Record<string, number> = {};

	for (const item of ROLES) {
		const inserted = await upsertRole(item);
		roleMap[inserted.role_name] = inserted.id;
	}

	console.log("\n-- Permissions ----------------------------");
	for (const item of [...SEED_PERMISSIONS, ...ACADEMIC_CALENDAR_PERMISSIONS]) {
		await upsertPermission(item);
	}

	const adminRoleId = roleMap.admin;

	if (!adminRoleId) {
		throw new Error('Missing role "admin" for permission grants');
	}

	console.log("\n-- Role Permissions -----------------------");
	await grantAdminFullPermissions(adminRoleId);

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
