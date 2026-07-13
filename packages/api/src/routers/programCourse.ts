import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { course } from "@tsms/db/schema/course";
import { program } from "@tsms/db/schema/program";
import { programCourse } from "@tsms/db/schema/programCourse";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const programIdSchema = z.object({
	programId: z.number().int().positive("Vui lòng chọn chương trình đào tạo"),
});

const createProgramCourseSchema = z.object({
	programId: z.number().int().positive("Vui lòng chọn chương trình đào tạo"),
	courseId: z.number().int().positive("Vui lòng chọn học phần"),
	semesterNo: z.number().int().positive("Học kỳ phải lớn hơn 0"),
	isRequired: z.number().int().min(0).max(1).default(1),
});

const updateProgramCourseSchema = createProgramCourseSchema.extend({
	programCourseId: z.number().int().positive("Vui lòng chọn học phần trong chương trình"),
});

const programCourseIdSchema = z.object({
	programCourseId: z.number().int().positive("Vui lòng chọn học phần trong chương trình"),
});

async function ensureProgramExists(programId: number) {
	const [existingProgram] = await db
		.select()
		.from(program)
		.where(eq(program.id, programId));

	if (!existingProgram) {
		throw new ORPCError("NOT_FOUND", {
			message: "Chương trình đào tạo không tồn tại",
		});
	}

	return existingProgram;
}

async function ensureCourseExists(courseId: number) {
	const [existingCourse] = await db.select().from(course).where(eq(course.id, courseId));

	if (!existingCourse) {
		throw new ORPCError("NOT_FOUND", {
			message: "Học phần không tồn tại",
		});
	}

	return existingCourse;
}

async function ensureProgramCourseExists(programCourseId: number) {
	const [existingProgramCourse] = await db
		.select()
		.from(programCourse)
		.where(eq(programCourse.id, programCourseId));

	if (!existingProgramCourse) {
		throw new ORPCError("NOT_FOUND", {
			message: "Học phần trong chương trình không tồn tại",
		});
	}

	return existingProgramCourse;
}

async function ensureUniqueProgramCourse(
	programId: number,
	courseId: number,
	programCourseId?: number,
) {
	const conditions = programCourseId
		? and(
				eq(programCourse.programId, programId),
				eq(programCourse.courseId, courseId),
				ne(programCourse.id, programCourseId),
			)
		: and(eq(programCourse.programId, programId), eq(programCourse.courseId, courseId));

	const [existingProgramCourse] = await db
		.select()
		.from(programCourse)
		.where(conditions);

	if (existingProgramCourse) {
		throw new ORPCError("CONFLICT", {
			message: "Học phần đã tồn tại trong chương trình đào tạo",
		});
	}
}

export const programCoursesRouter = {
	options: permissionProcedure("programs", "read")
		.input(
			z
				.object({
					programId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const programCourseRows = input?.programId
				? await db
						.select()
						.from(programCourse)
						.where(eq(programCourse.programId, input.programId))
				: await db.select().from(programCourse);
			const courseRows = await db.select().from(course);

			return {
				programCourses: programCourseRows.map((item) => {
					const courseItem =
						courseRows.find((courseRow) => courseRow.id === item.courseId) ?? null;

					return {
						id: item.id,
						programId: item.programId,
						courseId: item.courseId,
						courseCode: courseItem?.code ?? "",
						courseName: courseItem?.name ?? "Không xác định",
						semesterNo: item.semesterNo,
						isRequired: item.isRequired,
					};
				}),
			};
		}),

	listByProgram: permissionProcedure("programs", "read")
	.input(programIdSchema)
	.handler(async ({ input }) => {
		await ensureProgramExists(input.programId);

		const programCourses = await db
			.select({
				id: programCourse.id,
				programId: programCourse.programId,
				courseId: programCourse.courseId,
				semesterNo: programCourse.semesterNo,
				isRequired: programCourse.isRequired,
				courseCode: course.code,
				courseName: course.name,
				credits: course.credits,
				departmentId: course.departmentId,
			})
			.from(programCourse)
			.innerJoin(course, eq(programCourse.courseId, course.id))
			.where(eq(programCourse.programId, input.programId));

		return {
			programCourses,
		};
	}),

	byId: permissionProcedure("programs", "read")
		.input(programCourseIdSchema)
		.handler(async ({ input }) => {
			const existingProgramCourse = await ensureProgramCourseExists(
				input.programCourseId,
			);
			const [programRows, courseRows] = await Promise.all([
				db
					.select()
					.from(program)
					.where(eq(program.id, existingProgramCourse.programId)),
				db
					.select()
					.from(course)
					.where(eq(course.id, existingProgramCourse.courseId)),
			]);
			const programItem = programRows[0] ?? null;
			const courseItem = courseRows[0] ?? null;

			return {
				programCourse: {
					...existingProgramCourse,
					programCode: programItem?.code ?? "",
					programName: programItem?.name ?? "Không xác định",
					courseCode: courseItem?.code ?? "",
					courseName: courseItem?.name ?? "Không xác định",
					credits: courseItem?.credits ?? 0,
				},
			};
		}),

	create: permissionProcedure("programs", "update")
		.input(createProgramCourseSchema)
		.handler(async ({ input }) => {
			await ensureProgramExists(input.programId);
			await ensureCourseExists(input.courseId);
			await ensureUniqueProgramCourse(input.programId, input.courseId);

			const [newProgramCourse] = await db
				.insert(programCourse)
				.values({
					programId: input.programId,
					courseId: input.courseId,
					semesterNo: input.semesterNo,
					isRequired: input.isRequired,
				})
				.returning();

			return {
				programCourse: newProgramCourse,
			};
		}),

	update: permissionProcedure("programs", "update")
		.input(updateProgramCourseSchema)
		.handler(async ({ input }) => {
			await ensureProgramCourseExists(input.programCourseId);
			await ensureProgramExists(input.programId);
			await ensureCourseExists(input.courseId);
			await ensureUniqueProgramCourse(
				input.programId,
				input.courseId,
				input.programCourseId,
			);

			const [updatedProgramCourse] = await db
				.update(programCourse)
				.set({
					programId: input.programId,
					courseId: input.courseId,
					semesterNo: input.semesterNo,
					isRequired: input.isRequired,
					updatedAt: new Date(),
				})
				.where(eq(programCourse.id, input.programCourseId))
				.returning();

			return {
				programCourse: updatedProgramCourse,
			};
		}),

	delete: permissionProcedure("programs", "update")
		.input(programCourseIdSchema)
		.handler(async ({ input }) => {
			await ensureProgramCourseExists(input.programCourseId);

			await db.delete(programCourse).where(eq(programCourse.id, input.programCourseId));

			return {
				success: true,
			};
		}),
};
