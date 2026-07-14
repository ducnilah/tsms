import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { department } from "@tsms/db/schema/department";
import { faculty } from "@tsms/db/schema/faculty";
import { studentClass } from "@tsms/db/schema/studentClass";
import { and, eq, ne, or, count, ilike } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const listFacultiesSchema = z.object({
	page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
	limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(10),
	search: z.string().trim().optional(),
	status: z.enum(["active", "inactive"]).optional(),
}).optional();

const createFacultySchema = z.object({
	code: z.string().trim().min(2, "Vui lòng nhập mã khoa tối thiểu 2 ký tự"),
	name: z.string().trim().min(3, "Vui lòng nhập tên khoa tối thiểu 3 ký tự"),
	description: z.string().trim(),
});

const updateFacultySchema = createFacultySchema.extend({
	facultyId: z.number(),
	status: z.enum(["active", "inactive"]).default("active"),
});

const facultyIdSchema = z.object({
	facultyId: z.number(),
});

async function ensureUniqueFacultyCode(code: string, facultyId?: number) {
	const conditions = facultyId
		? and(eq(faculty.code, code), ne(faculty.id, facultyId))
		: eq(faculty.code, code);
	const [existingFaculty] = await db.select().from(faculty).where(conditions);

	if (existingFaculty) {
		throw new ORPCError("CONFLICT", {
			message: "Mã khoa đã tồn tại",
		});
	}
}

async function ensureFacultyExists(facultyId: number) {
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

export const facultiesRouter = {
	list: permissionProcedure("faculties", "read")
		.input(listFacultiesSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 10;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.status ? eq(faculty.status, input?.status) : undefined,
				input?.search
					? or(
							ilike(faculty.code, `%${input.search}%`),
							ilike(faculty.name, `%${input.search}%`)
						)
					: undefined
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [facultyRows, totalCount] = await Promise.all([
				db
					.select({
						id: faculty.id,
						code: faculty.code,
						name: faculty.name,
						description: faculty.description,
						status: faculty.status,
					})
					.from(faculty)
					.where(where)
					.limit(limit)
					.offset(offset),
				db.select({ total: count() }).from(faculty).where(where),
			]);

			const total = totalCount[0]?.total ?? 0;

			return {
				faculties: facultyRows,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	options: permissionProcedure("faculties", "read").handler(async () => {
		const faculties = await db.select().from(faculty);

		return {
			faculties: faculties.map((item) => ({
				id: item.id,
				code: item.code,
				name: item.name,
				status: item.status,
			})),
		};
	}),

	byId: permissionProcedure("faculties", "read")
		.input(facultyIdSchema)
		.handler(async ({ input }) => {
			const existingFaculty = await ensureFacultyExists(input.facultyId);
			const [departmentRows, classRows] = await Promise.all([
				db
					.select({ id: department.id })
					.from(department)
					.where(eq(department.facultyId, input.facultyId)),
				db
					.select({ id: studentClass.id })
					.from(studentClass)
					.where(eq(studentClass.facultyId, input.facultyId)),
			]);

			return {
				faculty: {
					...existingFaculty,
					departmentCount: departmentRows.length,
					studentClassCount: classRows.length,
				},
			};
		}),

	create: permissionProcedure("faculties", "create")
		.input(createFacultySchema)
		.handler(async ({ input }) => {
			await ensureUniqueFacultyCode(input.code);

			const [newFaculty] = await db
				.insert(faculty)
				.values({
					code: input.code,
					name: input.name,
					description: input.description,
				})
				.returning();

			return {
				faculty: newFaculty,
			};
		}),

	update: permissionProcedure("faculties", "update")
		.input(updateFacultySchema)
		.handler(async ({ input }) => {
			await ensureFacultyExists(input.facultyId);
			await ensureUniqueFacultyCode(input.code, input.facultyId);

			const [updatedFaculty] = await db
				.update(faculty)
				.set({
					code: input.code,
					name: input.name,
					description: input.description,
					updatedAt: new Date(),
					status: input.status,
				})
				.where(eq(faculty.id, input.facultyId))
				.returning();

			return {
				faculty: updatedFaculty,
			};
		}),

	delete: permissionProcedure("faculties", "delete")
		.input(facultyIdSchema)
		.handler(async ({ input }) => {
			await ensureFacultyExists(input.facultyId);

			const [departmentRows, classRows] = await Promise.all([
				db
					.select({ id: department.id })
					.from(department)
					.where(eq(department.facultyId, input.facultyId)),
				db
					.select({ id: studentClass.id })
					.from(studentClass)
					.where(eq(studentClass.facultyId, input.facultyId)),
			]);

			if (departmentRows.length > 0 || classRows.length > 0) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Không thể xóa khoa khi vẫn còn bộ môn hoặc lớp sinh viên liên kết",
				});
			}

			await db.delete(faculty).where(eq(faculty.id, input.facultyId));

			return {
				success: true,
			};
		}),

	lock: permissionProcedure("faculties", "update")
		.input(facultyIdSchema)
		.handler(async ({ input }) => {
			await ensureFacultyExists(input.facultyId);

			const [updatedFaculty] = await db
				.update(faculty)
				.set({
					status: "inactive",
					updatedAt: new Date(),
				})
				.where(eq(faculty.id, input.facultyId))
				.returning();

			return {
				faculty: updatedFaculty,
			};
		}),

	unlock: permissionProcedure("faculties", "update")
		.input(facultyIdSchema)
		.handler(async ({ input }) => {
			await ensureFacultyExists(input.facultyId);

			const [updatedFaculty] = await db
				.update(faculty)
				.set({
					status: "active",
					updatedAt: new Date(),
				})
				.where(eq(faculty.id, input.facultyId))
				.returning();

			return {
				faculty: updatedFaculty,
			};
		}),
};
