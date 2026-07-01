import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { course } from "@tsms/db/schema/course";
import { department } from "@tsms/db/schema/department";
import { faculty } from "@tsms/db/schema/faculty";
import { lecturer } from "@tsms/db/schema/lecturer";
import { program } from "@tsms/db/schema/program";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const departmentStatusSchema = z.enum(["active", "inactive"]);

const createDepartmentSchema = z.object({
	facultyId: z.number(),
	code: z.string().trim().min(2, "Vui lòng nhập mã bộ môn tối thiểu 2 ký tự"),
	name: z.string().trim().min(3, "Vui lòng nhập tên bộ môn tối thiểu 3 ký tự"),
	description: z
		.string()
		.trim()
		.min(3, "Vui lòng nhập mô tả bộ môn tối thiểu 3 ký tự"),
	status: departmentStatusSchema.default("active"),
});

const updateDepartmentSchema = createDepartmentSchema.extend({
	departmentId: z.number(),
});

const facultyIdSchema = z.object({
	facultyId: z.number(),
});

const departmentIdSchema = z.object({
	departmentId: z.number(),
});

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

async function ensureDepartmentExists(departmentId: number) {
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

async function ensureUniqueDepartmentCode(code: string, departmentId?: number) {
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
	listByFaculty: permissionProcedure("faculties", "read")
		.input(facultyIdSchema)
		.handler(async ({ input }) => {
			await ensureFacultyExists(input.facultyId);

			const [departments, lecturers, courses, programs] = await Promise.all([
				db
					.select()
					.from(department)
					.where(eq(department.facultyId, input.facultyId)),
				db.select().from(lecturer),
				db.select().from(course),
				db.select().from(program),
			]);

			return {
				departments: departments.map((item) => ({
					...item,
					lecturerCount: lecturers.filter(
						(lecturerItem) => lecturerItem.departmentId === item.id,
					).length,
					courseCount: courses.filter(
						(courseItem) => courseItem.departmentId === item.id,
					).length,
					programCount: programs.filter(
						(programItem) => programItem.departmentId === item.id,
					).length,
				})),
			};
		}),

	create: permissionProcedure("faculties", "create")
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
					status: input.status,
				})
				.returning();

			return {
				department: newDepartment,
			};
		}),

	update: permissionProcedure("faculties", "update")
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

	delete: permissionProcedure("faculties", "delete")
		.input(departmentIdSchema)
		.handler(async ({ input }) => {
			await ensureDepartmentExists(input.departmentId);

			const [lecturerRows, courseRows, programRows] = await Promise.all([
				db
					.select({ id: lecturer.id })
					.from(lecturer)
					.where(eq(lecturer.departmentId, input.departmentId)),
				db
					.select({ id: course.id })
					.from(course)
					.where(eq(course.departmentId, input.departmentId)),
				db
					.select({ id: program.id })
					.from(program)
					.where(eq(program.departmentId, input.departmentId)),
			]);

			if (
				lecturerRows.length > 0 ||
				courseRows.length > 0 ||
				programRows.length > 0
			) {
				throw new ORPCError("BAD_REQUEST", {
					message:
						"Không thể xóa bộ môn khi vẫn còn giảng viên, học phần hoặc chương trình liên kết",
				});
			}

			await db.delete(department).where(eq(department.id, input.departmentId));

			return {
				success: true,
			};
		}),
};
