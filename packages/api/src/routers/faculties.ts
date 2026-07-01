import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { department } from "@tsms/db/schema/department";
import { faculty } from "@tsms/db/schema/faculty";
import { studentClass } from "@tsms/db/schema/studentClass";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const createFacultySchema = z.object({
	code: z.string().trim().min(2, "Vui lòng nhập mã khoa tối thiểu 2 ký tự"),
	name: z.string().trim().min(3, "Vui lòng nhập tên khoa tối thiểu 3 ký tự"),
	description: z
		.string()
		.trim()
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
	list: permissionProcedure("faculties", "read").handler(async () => {
		const [faculties, departments, classes] = await Promise.all([
			db.select().from(faculty),
			db.select().from(department),
			db.select().from(studentClass),
		]);

		return {
			faculties: faculties.map((item) => ({
				...item,
				departmentCount: departments.filter(
					(departmentItem) => departmentItem.facultyId === item.id,
				).length,
				studentClassCount: classes.filter(
					(classItem) => classItem.facultyId === item.id,
				).length,
			})),
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
};
