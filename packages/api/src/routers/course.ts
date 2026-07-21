import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { course } from "@tsms/db/schema/course";
import { department } from "@tsms/db/schema/department";
import { originalCourse } from "@tsms/db/schema/originalCourse";
import { programCourse } from "@tsms/db/schema/programCourse";
import { and, count, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";
import { ensureDepartmentExists } from "./departments";

const courseStatusSchema = z.enum(["active", "inactive"]);

const creditSchema = z
	.number()
	.nonnegative("Vui lòng nhập số tín chỉ hợp lệ")
	.refine((value) => Number.isInteger(value * 10), {
		message: "Số tín chỉ chỉ được có tối đa 1 chữ số sau dấu phẩy",
	})
	.refine((value) => value === 0 || value >= 1, {
		message: "Nếu có tín chỉ thì phải từ 1 trở lên",
	})
	.refine((value) => Number.isInteger(value * 2), {
		message: "Số tín chỉ phải chia hết cho 0.5",
	});

const listCoursesSchema = z
	.object({
		page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
		limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(6),
		search: z.string().trim().optional(),
		departmentId: z.number().int().positive("Vui lòng chọn bộ môn").optional(),
		facultyId: z.number().int().positive("Vui lòng chọn khoa").optional(),
		status: courseStatusSchema.optional(),
	})
	.optional();

const createCourseSchema = z
	.object({
		code: z.string().trim().min(2, "Vui lòng nhập mã học phần tối thiểu 2 ký tự"),
		name: z.string().trim().min(3, "Vui lòng nhập tên học phần tối thiểu 3 ký tự"),
		lectureCredits: creditSchema,
		practiceCredits: creditSchema,
		departmentId: z.number().int().positive("Vui lòng chọn bộ môn cho học phần"),
		description: z.string().trim().optional(),
	})
	.refine((data) => data.lectureCredits + data.practiceCredits > 0, {
		message: "Học phần phải có ít nhất 1 tín chỉ lý thuyết hoặc thực hành",
		path: ["lectureCredits"],
	});

const updateCourseSchema = createCourseSchema.extend({
	courseId: z.number().int().positive("Vui lòng chọn học phần cần cập nhật"),
	status: courseStatusSchema,
});

const courseIdSchema = z.object({
	courseId: z.number().int().positive("Vui lòng chọn học phần cần thao tác"),
});

const courseIdsSchema = z.object({
	courseIds: z.array(z.number().int().positive()).min(1, "Vui lòng chọn ít nhất một học phần"),
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

function calculateCourseSessions(input: {
	lectureCredits: number;
	practiceCredits: number;
}) {
	return {
		lectureSessions: Math.round(input.lectureCredits * 15),
		practiceSessions: Math.round(input.practiceCredits * 30),
	};
}

async function upsertOriginalCourseForCourse(input: z.infer<typeof createCourseSchema>) {
	const sessions = calculateCourseSessions(input);
	const originalCourseData = {
		code: input.code,
		name: input.name,
		departmentId: input.departmentId,
		description: input.description,
		lectureCredits: input.lectureCredits,
		practiceCredits: input.practiceCredits,
		lectureSessions: sessions.lectureSessions,
		practiceSessions: sessions.practiceSessions,
		status: "active",
	};
	const [existingOriginalCourse] = await db
		.select()
		.from(originalCourse)
		.where(eq(originalCourse.code, input.code));

	if (existingOriginalCourse) {
		const [updatedOriginalCourse] = await db
			.update(originalCourse)
			.set({
				...originalCourseData,
				updatedAt: new Date(),
			})
			.where(eq(originalCourse.id, existingOriginalCourse.id))
			.returning();

		return updatedOriginalCourse ?? existingOriginalCourse;
	}

	const [newOriginalCourse] = await db
		.insert(originalCourse)
		.values(originalCourseData)
		.returning();

	if (!newOriginalCourse) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Không thể tạo học phần gốc",
		});
	}

	return newOriginalCourse;
}

export const courseRouter = {
	list: permissionProcedure("courses", "read")
		.input(listCoursesSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 6;
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
						originalCourseId: course.originalCourseId,
						code: course.code,
						name: course.name,
						lectureCredits: course.lectureCredits,
						practiceCredits: course.practiceCredits,
						lectureSessions: course.lectureSessions,
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
					originalCourseId: course.originalCourseId,
					originalCourseCode: originalCourse.code,
					originalCourseName: originalCourse.name,
					departmentId: course.departmentId,
					code: course.code,
					name: course.name,
					lectureCredits: course.lectureCredits,
					practiceCredits: course.practiceCredits,
					status: course.status,
				})
				.from(course)
				.innerJoin(department, eq(course.departmentId, department.id))
				.innerJoin(originalCourse, eq(course.originalCourseId, originalCourse.id))
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
			const originalCourseRow = await upsertOriginalCourseForCourse(input);
			const sessions = calculateCourseSessions(input);

			const [newCourse] = await db
				.insert(course)
				.values({
					originalCourseId: originalCourseRow.id,
					code: input.code,
					name: input.name,
					departmentId: input.departmentId,
					description: input.description,
					lectureCredits: input.lectureCredits,
					practiceCredits: input.practiceCredits,
					lectureSessions: sessions.lectureSessions,
					practiceSessions: sessions.practiceSessions,
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
			const originalCourseRow = await upsertOriginalCourseForCourse(input);
			const sessions = calculateCourseSessions(input);

			const [updatedCourse] = await db
				.update(course)
				.set({
					originalCourseId: originalCourseRow.id,
					code: input.code,
					name: input.name,
					departmentId: input.departmentId,
					description: input.description,
					lectureCredits: input.lectureCredits,
					practiceCredits: input.practiceCredits,
					lectureSessions: sessions.lectureSessions,
					practiceSessions: sessions.practiceSessions,
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
		.input(courseIdsSchema)
		.handler(async ({ input }) => {
			const courseIds = Array.from(new Set(input.courseIds));

			const [existingCourses, existingProgramCourses] = await Promise.all([
				db
					.select({ id: course.id })
					.from(course)
					.where(inArray(course.id, courseIds)),
				db
					.select({ id: programCourse.id })
					.from(programCourse)
					.where(inArray(programCourse.courseId, courseIds)),
			]);

			if (existingCourses.length !== courseIds.length) {
				throw new ORPCError("NOT_FOUND", {
					message: "Một hoặc nhiều học phần không tồn tại",
				});
			}

			if (existingProgramCourses.length > 0) {
				throw new ORPCError("CONFLICT", {
					message: "Một hoặc nhiều học phần đang được sử dụng trong chương trình đào tạo, không thể xóa",
				});
			}

			await db.delete(course).where(inArray(course.id, courseIds));

			return {
				success: true,
				deletedCount: courseIds.length,
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
