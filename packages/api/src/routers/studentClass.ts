import { db } from "@tsms/db";
import { faculty } from "@tsms/db/schema/faculty";
import { major } from "@tsms/db/schema/major";
import { program } from "@tsms/db/schema/program";
import { studentClass } from "@tsms/db/schema/studentClass";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

export const studentClassesRouter = {
	options: permissionProcedure("students", "read")
		.input(
			z
				.object({
					facultyId: z.number().int().positive().optional(),
					majorId: z.number().int().positive().optional(),
					programId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const conditions = [
				input?.facultyId ? eq(studentClass.facultyId, input.facultyId) : undefined,
				input?.majorId ? eq(studentClass.majorId, input.majorId) : undefined,
				input?.programId ? eq(studentClass.programId, input.programId) : undefined,
			].filter(Boolean);

			const rows = await db
				.select({
					id: studentClass.id,
					code: studentClass.code,
					name: studentClass.name,
					facultyId: studentClass.facultyId,
					majorId: studentClass.majorId,
					programId: studentClass.programId,
					facultyCode: faculty.code,
					facultyName: faculty.name,
					majorCode: major.code,
					majorName: major.name,
					programCode: program.code,
					programName: program.name,
				})
				.from(studentClass)
				.innerJoin(faculty, eq(studentClass.facultyId, faculty.id))
				.innerJoin(major, eq(studentClass.majorId, major.id))
				.innerJoin(program, eq(studentClass.programId, program.id))
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			return {
				studentClasses: rows,
			};
		}),
};
