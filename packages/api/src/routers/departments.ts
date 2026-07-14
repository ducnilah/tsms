import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { course } from "@tsms/db/schema/course";
import { department } from "@tsms/db/schema/department";
import { faculty } from "@tsms/db/schema/faculty";
import { lecturer } from "@tsms/db/schema/lecturer";
import { and, eq, ne, count, ilike } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const listDepartmentsSchema = z.object({
	page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
	limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(10),
	search: z.string().trim().optional(),
	facultyId: z.number().int().positive("Vui lòng chọn khoa").optional(),
	status: z.enum(["active", "inactive"]).optional(),
}).optional();

const createDepartmentSchema = z.object({
	facultyId: z.number(),
	code: z.string().trim().min(2, "Vui lòng nhập mã bộ môn tối thiểu 2 ký tự"),
	name: z.string().trim().min(3, "Vui lòng nhập tên bộ môn tối thiểu 3 ký tự"),
	description: z.string().trim(),
});

const updateDepartmentSchema = createDepartmentSchema.extend({
	departmentId: z.number(),
	status: z.enum(["active", "inactive"]),
});

export const facultyIdSchema = z.object({
	facultyId: z.number(),
});

export const departmentIdSchema = z.object({
	departmentId: z.number(),
});

export async function ensureFacultyExists(facultyId: number) {
	const [existingFaculty] = await db
		.select()
		.from(faculty)
		.where(eq(faculty.id, facultyId));

	if (!existingFaculty) {
		throw new ORPCError("NOT_FOUND", {
			message: "Khoa không tồn tại",
		});
	}

	return existingFaculty;
}

export async function ensureDepartmentExists(departmentId: number) {
	const [existingDepartment] = await db
		.select()
		.from(department)
		.where(eq(department.id, departmentId));

	if (!existingDepartment) {
		throw new ORPCError("NOT_FOUND", {
			message: "Bộ môn không tồn tại",
		});
	}

	return existingDepartment;
}

export async function ensureUniqueDepartmentCode(code: string, departmentId?: number) {
	const conditions = departmentId
		? and(eq(department.code, code), ne(department.id, departmentId))
		: eq(department.code, code);
	const [existingDepartment] = await db
		.select()
		.from(department)
		.where(conditions);

	if (existingDepartment) {
		throw new ORPCError("CONFLICT", {
			message: "Mã bộ môn đã tồn tại",
		});
	}
}

export const departmentsRouter = {
	options: permissionProcedure("departments", "read")
		.input(
			z
				.object({
					facultyId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const departments = input?.facultyId
				? await db
						.select()
						.from(department)
						.where(eq(department.facultyId, input.facultyId))
				: await db.select().from(department);

			return {
				departments: departments.map((item) => ({
					id: item.id,
					facultyId: item.facultyId,
					code: item.code,
					name: item.name,
					status: item.status,
				})),
			};
		}),

	list: permissionProcedure("departments", "read")
		.input(listDepartmentsSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 10;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.facultyId ? eq(department.facultyId, input?.facultyId) : undefined,
				input?.status ? eq(department.status, input?.status) : undefined,
				input?.search
					? ilike(department.code, `%${input?.search}%`)
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [departmentRows, totalRows] = await Promise.all([
				db
					.select()
					.from(department)
					.where(where)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(department)
					.where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				departments: departmentRows,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				}
			};
		}),

	byId: permissionProcedure("departments", "read")
		.input(departmentIdSchema)
		.handler(async ({ input }) => {
			const existingDepartment = await ensureDepartmentExists(input.departmentId);
			const [facultyItem] = await db
				.select()
				.from(faculty)
				.where(eq(faculty.id, existingDepartment.facultyId));
			const [lecturerRows, courseRows] = await Promise.all([
				db
					.select({ id: lecturer.id })
					.from(lecturer)
					.where(eq(lecturer.departmentId, input.departmentId)),
				db
					.select({ id: course.id })
					.from(course)
					.where(eq(course.departmentId, input.departmentId)),
			]);

			return {
				department: {
					...existingDepartment,
					facultyName: facultyItem?.name ?? "Không xác định",
					facultyCode: facultyItem?.code ?? "",
					lecturerCount: lecturerRows.length,
					courseCount: courseRows.length,
				},
			};
		}),

	create: permissionProcedure("departments", "create")
		.input(createDepartmentSchema)
		.handler(async ({ input }) => {
			await ensureFacultyExists(input.facultyId);
			await ensureUniqueDepartmentCode(input.code);

			const [newDepartment] = await db
				.insert(department)
				.values({
					facultyId: input.facultyId,
					code: input.code,
					name: input.name,
					description: input.description,
				})
				.returning();

			return {
				department: newDepartment,
			};
		}),

	update: permissionProcedure("departments", "update")
		.input(updateDepartmentSchema)
		.handler(async ({ input }) => {
			await ensureDepartmentExists(input.departmentId);
			await ensureFacultyExists(input.facultyId);
			await ensureUniqueDepartmentCode(input.code, input.departmentId);

			const [updatedDepartment] = await db
				.update(department)
				.set({
					facultyId: input.facultyId,
					code: input.code,
					name: input.name,
					description: input.description,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(department.id, input.departmentId))
				.returning();

			return {
				department: updatedDepartment,
			};
		}),

	delete: permissionProcedure("departments", "delete")
		.input(departmentIdSchema)
		.handler(async ({ input }) => {
			await ensureDepartmentExists(input.departmentId);

			const [lecturerRows, courseRows] = await Promise.all([
				db
					.select({ id: lecturer.id })
					.from(lecturer)
					.where(eq(lecturer.departmentId, input.departmentId)),
				db
					.select({ id: course.id })
					.from(course)
					.where(eq(course.departmentId, input.departmentId)),
			]);

			if (
				lecturerRows.length > 0 ||
				courseRows.length > 0
			) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Không thể xóa bộ môn khi vẫn còn giảng viên, học phần ở trong bộ môn này",
				});
			}

			await db.delete(department).where(eq(department.id, input.departmentId));

			return {
				success: true,
			};
		}),

	lock: permissionProcedure("departments", "update")
		.input(departmentIdSchema)
		.handler(async ({ input }) => {
			await ensureDepartmentExists(input.departmentId);

			const [updatedDepartment] = await db
				.update(department)
				.set({
					status: "inactive",
					updatedAt: new Date(),
				})
				.where(eq(department.id, input.departmentId))
				.returning();

			return {
				department: updatedDepartment,
			};
		}),

	unlock: permissionProcedure("departments", "update")
		.input(departmentIdSchema)
		.handler(async ({ input }) => {
			await ensureDepartmentExists(input.departmentId);

			const [updatedDepartment] = await db
				.update(department)
				.set({
					status: "active",
					updatedAt: new Date(),
				})
				.where(eq(department.id, input.departmentId))
				.returning();

			return {
				department: updatedDepartment,
			};
		}),
};
