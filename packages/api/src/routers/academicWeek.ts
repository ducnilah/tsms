import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { semester } from "@tsms/db/schema/semester";
import { semesterWeek } from "@tsms/db/schema/semesterWeek";
import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";
import { ensureSemesterExists } from "./semester";

const semesterIdSchema = z.object({
	semesterId: z.number().int().positive("Vui lòng chọn học kỳ"),
});

const listAcademicWeeksSchema = z
	.object({
		page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
		limit: z
			.number()
			.int()
			.positive("Vui lòng nhập số lượng bản ghi hợp lệ")
			.default(20),
		search: z.string().trim().optional(),
		academicYearId: z.number().int().positive("Vui lòng chọn năm học").optional(),
		semesterId: z.number().int().positive("Vui lòng chọn học kỳ").optional(),
		isTeachingWeek: z.boolean().optional(),
	})
	.optional();

const academicWeekIdSchema = z.object({
	weekId: z.number().int().positive("Vui lòng chọn tuần học"),
});

const updateAcademicWeekSchema = z.object({
	weekId: z.number().int().positive("Vui lòng chọn tuần học"),
	isTeachingWeek: z.boolean(),
	note: z.string().trim().default(""),
});

async function ensureAcademicWeekExists(weekId: number) {
	const [existingWeek] = await db
		.select()
		.from(semesterWeek)
		.where(eq(semesterWeek.id, weekId));

	if (!existingWeek) {
		throw new ORPCError("NOT_FOUND", {
			message: "Tuần học không tồn tại",
		});
	}

	return existingWeek;
}

export const academicWeeksRouter = {
	list: permissionProcedure("semester-weeks", "read")
		.input(listAcademicWeeksSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 20;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.academicYearId
					? eq(semester.academicYearId, input.academicYearId)
					: undefined,
				input?.semesterId ? eq(semesterWeek.semesterId, input.semesterId) : undefined,
				typeof input?.isTeachingWeek === "boolean"
					? eq(semesterWeek.isTeachingWeek, input.isTeachingWeek)
					: undefined,
				input?.search
					? or(
							ilike(semesterWeek.note, `%${input.search}%`),
							ilike(semester.code, `%${input.search}%`),
							ilike(semester.name, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [weeks, totalRows] = await Promise.all([
				db
					.select({
						id: semesterWeek.id,
						semesterId: semesterWeek.semesterId,
						semesterCode: semester.code,
						semesterName: semester.name,
						academicYearId: semester.academicYearId,
						weekNumber: semesterWeek.weekNumber,
						startDate: semesterWeek.startDate,
						endDate: semesterWeek.endDate,
						isTeachingWeek: semesterWeek.isTeachingWeek,
						note: semesterWeek.note,
						createdAt: semesterWeek.createdAt,
						updatedAt: semesterWeek.updatedAt,
					})
					.from(semesterWeek)
					.innerJoin(semester, eq(semesterWeek.semesterId, semester.id))
					.where(where)
					.orderBy(asc(semesterWeek.startDate))
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(semesterWeek)
					.innerJoin(semester, eq(semesterWeek.semesterId, semester.id))
					.where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				weeks,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	listBySemester: permissionProcedure("semester-weeks", "read")
		.input(semesterIdSchema)
		.handler(async ({ input }) => {
			await ensureSemesterExists(input.semesterId);

			const weeks = await db
				.select()
				.from(semesterWeek)
				.where(eq(semesterWeek.semesterId, input.semesterId))
				.orderBy(asc(semesterWeek.weekNumber));

			return {
				weeks,
			};
		}),

	byId: permissionProcedure("semester-weeks", "read")
		.input(academicWeekIdSchema)
		.handler(async ({ input }) => {
			const week = await ensureAcademicWeekExists(input.weekId);
			const existingSemester = await ensureSemesterExists(week.semesterId);

			return {
				week: {
					...week,
					semesterCode: existingSemester.code,
					semesterName: existingSemester.name,
					academicYearId: existingSemester.academicYearId,
				},
			};
		}),

	update: permissionProcedure("semester-weeks", "update")
		.input(updateAcademicWeekSchema)
		.handler(async ({ input }) => {
			await ensureAcademicWeekExists(input.weekId);

			const [updatedWeek] = await db
				.update(semesterWeek)
				.set({
					isTeachingWeek: input.isTeachingWeek,
					note: input.note,
					updatedAt: new Date(),
				})
				.where(eq(semesterWeek.id, input.weekId))
				.returning();

			return {
				week: updatedWeek,
			};
		}),
};
