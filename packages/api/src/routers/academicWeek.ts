import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { semesterWeek } from "@tsms/db/schema/semesterWeek";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";
import { ensureSemesterExists } from "./semester";

const semesterIdSchema = z.object({
	semesterId: z.number().int().positive("Vui lòng chọn học kỳ"),
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
	listBySemester: permissionProcedure("semester-weeks", "read")
		.input(semesterIdSchema)
		.handler(async ({ input }) => {
			await ensureSemesterExists(input.semesterId);

			const weeks = await db
				.select()
				.from(semesterWeek)
				.where(eq(semesterWeek.semesterId, input.semesterId));

			return {
				weeks,
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
