import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { course } from "@tsms/db/schema/course";
import { department } from "@tsms/db/schema/department";
import { programCourse } from "@tsms/db/schema/programCourse";
import { and, eq, ne, ilike, count, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";
import { ensureDepartmentExists } from "./departments";

const listCoursesSchema = z.object({
    page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
    limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(10),
    search: z.string().trim().optional(),
    departmentId: z.number().int().positive("Vui lòng chọn bộ môn").optional(),
    facultyId: z.number().int().positive("Vui lòng chọn khoa").optional(),
    status: z.enum(["active", "inactive"]).optional(),
}).optional();

const createCourseSchema = z.object({
	code: z.string().trim().min(2, "Vui lòng nhập mã học phần tối thiểu 2 ký tự"),
	name: z.string().trim().min(3, "Vui lòng nhập tên học phần tối thiểu 3 ký tự"),
	credits: z.number().int().positive("Vui lòng nhập số tín chỉ hợp lệ"),
	lectureSessions: z.number().int().nonnegative("Vui lòng nhập số buổi lý thuyết hợp lệ"),
	labSessions: z.number().int().nonnegative("Vui lòng nhập số buổi lab hợp lệ"),
	practiceSessions: z.number().int().nonnegative("Vui lòng nhập số buổi thực hành hợp lệ"),
	departmentId: z.number().int().positive("Vui lòng chọn bộ môn cho học phần"),
	description: z.string().trim().optional(),
});

const updateCourseSchema = createCourseSchema.extend({
	courseId: z.number().int().positive("Vui lòng chọn học phần cần cập nhật"),
	status: z.enum(["active", "inactive"]),
});

const courseIdSchema = z.object({
	courseId: z.number().int().positive("Vui lòng chọn học phần cần thao tác"),
});

async function ensureCourseExists(courseId: number) {
	const [existingCourse] = await db.select().from(course).where(eq(course.id, courseId));

	if (!existingCourse) {
		throw new ORPCError("NOT_FOUND", {
			message: "Học phần không tồn tại",
		});
	}

	return existingCourse;
}

async function ensureCourseCodeUnique(code: string, courseId?: number) {
	const conditions = courseId
		? and(eq(course.code, code), ne(course.id, courseId))
		: eq(course.code, code);
	const [existingCourse] = await db.select().from(course).where(conditions);

	if (existingCourse) {
		throw new ORPCError("CONFLICT", {
			message: "Mã học phần đã tồn tại",
		});
	}
}

export const courseRouter = {
	list: permissionProcedure("courses", "read")
	.input(listCoursesSchema)
	.handler(async ({ input }) => {
		const page = input?.page ?? 1;
		const limit = input?.limit ?? 10;
		const offset = (page - 1) * limit;

		const conditions = [
			input?.departmentId ? eq(course.departmentId, input.departmentId) : undefined,
			input?.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
			input?.status ? eq(course.status, input.status) : undefined,
			input?.search
				? or(
						ilike(course.code, `%${input.search}%`),
						ilike(course.name, `%${input.search}%`),
					)
				: undefined,
		].filter(Boolean);

		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const [courseRows, totalRows] = await Promise.all([
			db
				.select({
					id: course.id,
					code: course.code,
					name: course.name,
					credits: course.credits,
					lectureSessions: course.lectureSessions,
					labSessions: course.labSessions,
					practiceSessions: course.practiceSessions,
					departmentId: course.departmentId,
					description: course.description,
					status: course.status,
					createdAt: course.createdAt,
					updatedAt: course.updatedAt,
					departmentCode: department.code,
					departmentName: department.name,
					facultyId: department.facultyId,
				})
				.from(course)
				.innerJoin(department, eq(course.departmentId, department.id))
				.where(where)
				.limit(limit)
				.offset(offset),
			db
				.select({ total: count() })
				.from(course)
				.innerJoin(department, eq(course.departmentId, department.id))
				.where(where),
		]);

		const total = totalRows[0]?.total ?? 0;

		return {
			courses: courseRows,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}),

	options: permissionProcedure("courses", "read")
		.input(
			z
				.object({
					departmentId: z.number().int().positive().optional(),
					facultyId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const conditions = [
				input?.departmentId ? eq(course.departmentId, input.departmentId) : undefined,
				input?.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
			].filter(Boolean);

			const courseRows = await db
				.select({
					id: course.id,
					departmentId: course.departmentId,
					code: course.code,
					name: course.name,
					credits: course.credits,
					status: course.status,
				})
				.from(course)
				.innerJoin(department, eq(course.departmentId, department.id))
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			return {
				courses: courseRows,
			};
		}),

	byId: permissionProcedure("courses", "read")
		.input(courseIdSchema)
		.handler(async ({ input }) => {
			const existingCourse = await ensureCourseExists(input.courseId);
			const [departmentItem] = await db
				.select()
				.from(department)
				.where(eq(department.id, existingCourse.departmentId));

			return {
				course: {
					...existingCourse,
					departmentName: departmentItem?.name ?? "Không xác định",
					departmentCode: departmentItem?.code ?? "",
					facultyId: departmentItem?.facultyId ?? null,
				},
			};
		}),

	create: permissionProcedure("courses", "create")
		.input(createCourseSchema)
		.handler(async ({ input }) => {
			await ensureDepartmentExists(input.departmentId);
			await ensureCourseCodeUnique(input.code);

			const [newCourse] = await db
				.insert(course)
				.values({
					code: input.code,
					name: input.name,
					departmentId: input.departmentId,
					description: input.description,
					credits: input.credits,
					lectureSessions: input.lectureSessions,
					labSessions: input.labSessions,
					practiceSessions: input.practiceSessions,
				})
				.returning();

			return {
				course: newCourse,
			};
		}),

	update: permissionProcedure("courses", "update")
		.input(updateCourseSchema)
		.handler(async ({ input }) => {
			await ensureCourseExists(input.courseId);
			await ensureDepartmentExists(input.departmentId);
			await ensureCourseCodeUnique(input.code, input.courseId);

			const [updatedCourse] = await db
				.update(course)
				.set({
					code: input.code,
					name: input.name,
					departmentId: input.departmentId,
					description: input.description,
					credits: input.credits,
					lectureSessions: input.lectureSessions,
					labSessions: input.labSessions,
					practiceSessions: input.practiceSessions,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(course.id, input.courseId))
				.returning();

			return {
				course: updatedCourse,
			};
		}),

	delete: permissionProcedure("courses", "delete")
		.input(courseIdSchema)
		.handler(async ({ input }) => {
			await ensureCourseExists(input.courseId);

			const [existingProgramCourse] = await db
				.select()
				.from(programCourse)
				.where(eq(programCourse.courseId, input.courseId));

			if (existingProgramCourse) {
				throw new ORPCError("CONFLICT", {
					message: "Học phần đang được sử dụng trong chương trình đào tạo, không thể xóa",
				});
			}

			await db.delete(course).where(eq(course.id, input.courseId));

			return {
				success: true,
			};
		}),

    lock: permissionProcedure("courses", "update")
        .input(courseIdSchema)
        .handler(async ({ input }) => {
            await ensureCourseExists(input.courseId);

            const [updatedCourse] = await db
                .update(course)
                .set({
                    status: "inactive",
                    updatedAt: new Date(),
                })
                .where(eq(course.id, input.courseId))
                .returning();

            return {
                course: updatedCourse,
            };
        }),

    unlock: permissionProcedure("courses", "update")
        .input(courseIdSchema)
        .handler(async ({ input }) => {
            await ensureCourseExists(input.courseId);

            const [updatedCourse] = await db
                .update(course)
                .set({
                    status: "active",
                    updatedAt: new Date(),
                })
                .where(eq(course.id, input.courseId))
                .returning();

            return {
                course: updatedCourse,
            };
        }),
};
