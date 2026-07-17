import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { classSession } from "@tsms/db/schema/classSession";
import { course } from "@tsms/db/schema/course";
import { courseClass } from "@tsms/db/schema/courseClass";
import { department } from "@tsms/db/schema/department";
import { faculty } from "@tsms/db/schema/faculty";
import { lecturer } from "@tsms/db/schema/lecturer";
import { semester } from "@tsms/db/schema/semester";
import { studentClass } from "@tsms/db/schema/studentClass";
import { and, count, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const courseClassStatusSchema = z.enum([
	"active",
	"inactive",
	"draft",
	"scheduled",
	"locked",
	"cancelled",
]);

const listCourseClassesSchema = z
	.object({
		page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
		limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(6),
		search: z.string().trim().optional(),
		semesterId: z.number().int().positive("Vui lòng chọn học kỳ").optional(),
		facultyId: z.number().int().positive("Vui lòng chọn khoa").optional(),
		departmentId: z.number().int().positive("Vui lòng chọn bộ môn").optional(),
		courseId: z.number().int().positive("Vui lòng chọn học phần").optional(),
		lecturerId: z.number().int().positive("Vui lòng chọn giảng viên").optional(),
		studentClassId: z.number().int().positive("Vui lòng chọn lớp sinh viên").optional(),
		status: courseClassStatusSchema.optional(),
	})
	.optional();

const createCourseClassSchema = z.object({
	semesterId: z.number().int().positive("Vui lòng chọn học kỳ"),
	courseId: z.number().int().positive("Vui lòng chọn học phần"),
	studentClassId: z.number().int().positive("Vui lòng chọn lớp sinh viên"),
	lecturerId: z.number().int().positive("Vui lòng chọn giảng viên"),
	expectedStudents: z.number().int().nonnegative("Vui lòng nhập sĩ số dự kiến hợp lệ"),
	weekNumbers: z.array(z.number().int().positive()).default([]),
	status: courseClassStatusSchema.default("active"),
});

const updateCourseClassSchema = createCourseClassSchema.extend({
	courseClassId: z.number().int().positive("Vui lòng chọn lớp học phần"),
});

const courseClassIdSchema = z.object({
	courseClassId: z.number().int().positive("Vui lòng chọn lớp học phần"),
});

const changeCourseClassStatusSchema = z.object({
	courseClassId: z.number().int().positive("Vui lòng chọn lớp học phần"),
	status: courseClassStatusSchema,
});

async function ensureCourseClassExists(courseClassId: number) {
	const [existingCourseClass] = await db
		.select()
		.from(courseClass)
		.where(eq(courseClass.id, courseClassId));

	if (!existingCourseClass) {
		throw new ORPCError("NOT_FOUND", {
			message: "Lớp học phần không tồn tại",
		});
	}

	return existingCourseClass;
}

async function ensureCourseClassRelations(input: {
	semesterId: number;
	courseId: number;
	studentClassId: number;
	lecturerId: number;
}) {
	const [semesterRows, courseRows, studentClassRows, lecturerRows] =
		await Promise.all([
			db.select().from(semester).where(eq(semester.id, input.semesterId)),
			db.select().from(course).where(eq(course.id, input.courseId)),
			db
				.select()
				.from(studentClass)
				.where(eq(studentClass.id, input.studentClassId)),
			db.select().from(lecturer).where(eq(lecturer.id, input.lecturerId)),
		]);

	if (!semesterRows[0]) {
		throw new ORPCError("NOT_FOUND", { message: "Học kỳ không tồn tại" });
	}

	if (!courseRows[0]) {
		throw new ORPCError("NOT_FOUND", { message: "Học phần không tồn tại" });
	}

	if (!studentClassRows[0]) {
		throw new ORPCError("NOT_FOUND", { message: "Lớp sinh viên không tồn tại" });
	}

	if (!lecturerRows[0]) {
		throw new ORPCError("NOT_FOUND", { message: "Giảng viên không tồn tại" });
	}
}

async function ensureCourseClassUnique(
	semesterId: number,
	courseId: number,
	studentClassId: number,
	courseClassId?: number,
) {
	const conditions = [
		eq(courseClass.semesterId, semesterId),
		eq(courseClass.courseId, courseId),
		eq(courseClass.studentClassId, studentClassId),
		courseClassId ? ne(courseClass.id, courseClassId) : undefined,
	].filter(Boolean);

	const [existingCourseClass] = await db
		.select()
		.from(courseClass)
		.where(and(...conditions));

	if (existingCourseClass) {
		throw new ORPCError("CONFLICT", {
			message: "Lớp học phần này đã tồn tại trong học kỳ",
		});
	}
}

export const courseClassesRouter = {
	list: permissionProcedure("course-classes", "read")
		.input(listCourseClassesSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 6;
			const offset = (page - 1) * limit;
			const conditions = [
				input?.semesterId ? eq(courseClass.semesterId, input.semesterId) : undefined,
				input?.courseId ? eq(courseClass.courseId, input.courseId) : undefined,
				input?.studentClassId
					? eq(courseClass.studentClassId, input.studentClassId)
					: undefined,
				input?.lecturerId ? eq(courseClass.lecturerId, input.lecturerId) : undefined,
				input?.departmentId ? eq(course.departmentId, input.departmentId) : undefined,
				input?.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
				input?.status ? eq(courseClass.status, input.status) : undefined,
				input?.search
					? or(
							ilike(course.code, `%${input.search}%`),
							ilike(course.name, `%${input.search}%`),
							ilike(studentClass.code, `%${input.search}%`),
							ilike(studentClass.name, `%${input.search}%`),
							ilike(lecturer.name, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);
			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [rows, totalRows] = await Promise.all([
				db
					.select({
						id: courseClass.id,
						semesterId: courseClass.semesterId,
						courseId: courseClass.courseId,
						studentClassId: courseClass.studentClassId,
						lecturerId: courseClass.lecturerId,
						expectedStudents: courseClass.expectedStudents,
						weekNumbers: courseClass.weekNumbers,
						status: courseClass.status,
						semesterName: semester.name,
						courseCode: course.code,
						courseName: course.name,
						departmentId: department.id,
						departmentName: department.name,
						facultyId: faculty.id,
						facultyName: faculty.name,
						studentClassCode: studentClass.code,
						studentClassName: studentClass.name,
						lecturerName: lecturer.name,
					})
					.from(courseClass)
					.innerJoin(semester, eq(courseClass.semesterId, semester.id))
					.innerJoin(course, eq(courseClass.courseId, course.id))
					.innerJoin(department, eq(course.departmentId, department.id))
					.innerJoin(faculty, eq(department.facultyId, faculty.id))
					.innerJoin(studentClass, eq(courseClass.studentClassId, studentClass.id))
					.innerJoin(lecturer, eq(courseClass.lecturerId, lecturer.id))
					.where(where)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(courseClass)
					.innerJoin(semester, eq(courseClass.semesterId, semester.id))
					.innerJoin(course, eq(courseClass.courseId, course.id))
					.innerJoin(department, eq(course.departmentId, department.id))
					.innerJoin(faculty, eq(department.facultyId, faculty.id))
					.innerJoin(studentClass, eq(courseClass.studentClassId, studentClass.id))
					.innerJoin(lecturer, eq(courseClass.lecturerId, lecturer.id))
					.where(where),
			]);

			const courseClassIds = rows.map((item) => item.id);
			const sessionCounts =
				courseClassIds.length > 0
					? await db
							.select({
								courseClassId: classSession.courseClassId,
								total: count(),
							})
							.from(classSession)
							.where(inArray(classSession.courseClassId, courseClassIds))
							.groupBy(classSession.courseClassId)
					: [];
			const sessionCountMap = new Map(
				sessionCounts.map((item) => [item.courseClassId, item.total]),
			);
			const total = totalRows[0]?.total ?? 0;

			return {
				courseClasses: rows.map((item) => ({
					...item,
					code: `${item.courseCode}-${item.studentClassCode}`,
					name: `${item.courseName} - ${item.studentClassName}`,
					sessionCount: sessionCountMap.get(item.id) ?? 0,
				})),
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	options: permissionProcedure("course-classes", "read")
		.input(
			z
				.object({
					semesterId: z.number().int().positive().optional(),
					facultyId: z.number().int().positive().optional(),
					departmentId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const conditions = [
				input?.semesterId ? eq(courseClass.semesterId, input.semesterId) : undefined,
				input?.departmentId ? eq(course.departmentId, input.departmentId) : undefined,
				input?.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
			].filter(Boolean);

			const rows = await db
				.select({
					id: courseClass.id,
					semesterId: courseClass.semesterId,
					courseId: courseClass.courseId,
					studentClassId: courseClass.studentClassId,
					lecturerId: courseClass.lecturerId,
					courseCode: course.code,
					courseName: course.name,
					studentClassCode: studentClass.code,
					studentClassName: studentClass.name,
					lecturerName: lecturer.name,
					status: courseClass.status,
				})
				.from(courseClass)
				.innerJoin(course, eq(courseClass.courseId, course.id))
				.innerJoin(department, eq(course.departmentId, department.id))
				.innerJoin(studentClass, eq(courseClass.studentClassId, studentClass.id))
				.innerJoin(lecturer, eq(courseClass.lecturerId, lecturer.id))
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			return {
				courseClasses: rows.map((item) => ({
					...item,
					code: `${item.courseCode}-${item.studentClassCode}`,
					name: `${item.courseName} - ${item.studentClassName}`,
				})),
			};
		}),

	byId: permissionProcedure("course-classes", "read")
		.input(courseClassIdSchema)
		.handler(async ({ input }) => {
			await ensureCourseClassExists(input.courseClassId);

			const [item] = await db
				.select({
					id: courseClass.id,
					semesterId: courseClass.semesterId,
					courseId: courseClass.courseId,
					studentClassId: courseClass.studentClassId,
					lecturerId: courseClass.lecturerId,
					expectedStudents: courseClass.expectedStudents,
					weekNumbers: courseClass.weekNumbers,
					status: courseClass.status,
					semesterName: semester.name,
					courseCode: course.code,
					courseName: course.name,
					departmentId: department.id,
					departmentName: department.name,
					facultyId: faculty.id,
					facultyName: faculty.name,
					studentClassCode: studentClass.code,
					studentClassName: studentClass.name,
					lecturerName: lecturer.name,
				})
				.from(courseClass)
				.innerJoin(semester, eq(courseClass.semesterId, semester.id))
				.innerJoin(course, eq(courseClass.courseId, course.id))
				.innerJoin(department, eq(course.departmentId, department.id))
				.innerJoin(faculty, eq(department.facultyId, faculty.id))
				.innerJoin(studentClass, eq(courseClass.studentClassId, studentClass.id))
				.innerJoin(lecturer, eq(courseClass.lecturerId, lecturer.id))
				.where(eq(courseClass.id, input.courseClassId));

			return {
				courseClass: item
					? {
							...item,
							code: `${item.courseCode}-${item.studentClassCode}`,
							name: `${item.courseName} - ${item.studentClassName}`,
						}
					: null,
			};
		}),

	create: permissionProcedure("course-classes", "create")
		.input(createCourseClassSchema)
		.handler(async ({ input }) => {
			await ensureCourseClassRelations(input);
			await ensureCourseClassUnique(
				input.semesterId,
				input.courseId,
				input.studentClassId,
			);

			const [newCourseClass] = await db
				.insert(courseClass)
				.values(input)
				.returning();

			return {
				courseClass: newCourseClass,
			};
		}),

	update: permissionProcedure("course-classes", "update")
		.input(updateCourseClassSchema)
		.handler(async ({ input }) => {
			await ensureCourseClassExists(input.courseClassId);
			await ensureCourseClassRelations(input);
			await ensureCourseClassUnique(
				input.semesterId,
				input.courseId,
				input.studentClassId,
				input.courseClassId,
			);

			const [updatedCourseClass] = await db
				.update(courseClass)
				.set({
					semesterId: input.semesterId,
					courseId: input.courseId,
					studentClassId: input.studentClassId,
					lecturerId: input.lecturerId,
					expectedStudents: input.expectedStudents,
					weekNumbers: input.weekNumbers,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(courseClass.id, input.courseClassId))
				.returning();

			return {
				courseClass: updatedCourseClass,
			};
		}),

	delete: permissionProcedure("course-classes", "delete")
		.input(courseClassIdSchema)
		.handler(async ({ input }) => {
			await ensureCourseClassExists(input.courseClassId);
			const [existingSession] = await db
				.select({ id: classSession.id })
				.from(classSession)
				.where(eq(classSession.courseClassId, input.courseClassId));

			if (existingSession) {
				throw new ORPCError("CONFLICT", {
					message: "Không thể xóa lớp học phần đã có buổi học",
				});
			}

			await db.delete(courseClass).where(eq(courseClass.id, input.courseClassId));

			return {
				success: true,
			};
		}),

	changeStatus: permissionProcedure("course-classes", "update")
		.input(changeCourseClassStatusSchema)
		.handler(async ({ input }) => {
			await ensureCourseClassExists(input.courseClassId);

			const [updatedCourseClass] = await db
				.update(courseClass)
				.set({
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(courseClass.id, input.courseClassId))
				.returning();

			return {
				courseClass: updatedCourseClass,
			};
		}),
};
