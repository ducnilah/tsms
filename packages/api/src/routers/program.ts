import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { major } from "@tsms/db/schema/major";
import { program } from "@tsms/db/schema/program";
import { programCourse } from "@tsms/db/schema/programCourse";
import { student } from "@tsms/db/schema/student";
import { studentClass } from "@tsms/db/schema/studentClass";
import { and, count, eq, ne, or, ilike } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const listProgramsSchema = z.object({
	page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
	limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(10),
	search: z.string().trim().optional(),
	academicYear: z.string().trim().optional(),
	majorId: z.number().int().positive("Vui lòng chọn ngành").optional(),
	status: z.enum(["active", "inactive"]).optional(),
}).optional();

const createProgramSchema = z.object({
	code: z.string().trim().min(2, "Vui lòng nhập mã chương trình tối thiểu 2 ký tự"),
	name: z.string().trim().min(3, "Vui lòng nhập tên chương trình tối thiểu 3 ký tự"),
	majorId: z.number().int().positive("Vui lòng chọn ngành"),
	academicYear: z.string().trim().min(4, "Vui lòng nhập khóa học hoặc niên khóa"),
	version: z.number().int().positive("Phiên bản chương trình không hợp lệ"),
	totalCredits: z.number().int().positive("Tổng tín chỉ phải lớn hơn 0"),
});

const updateProgramSchema = createProgramSchema.extend({
	programId: z.number().int().positive("Vui lòng chọn chương trình cần cập nhật"),
	status: z.enum(["active", "inactive"]),
});

const programIdSchema = z.object({
	programId: z.number().int().positive("Vui lòng chọn chương trình cần thao tác"),
});

async function ensureMajorExists(majorId: number) {
	const [existingMajor] = await db.select().from(major).where(eq(major.id, majorId));

	if (!existingMajor) {
		throw new ORPCError("NOT_FOUND", {
			message: "Ngành không tồn tại",
		});
	}

	return existingMajor;
}

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

async function ensureUniqueProgramCode(code: string, programId?: number) {
	const conditions = programId
		? and(eq(program.code, code), ne(program.id, programId))
		: eq(program.code, code);
	const [existingProgram] = await db.select().from(program).where(conditions);

	if (existingProgram) {
		throw new ORPCError("CONFLICT", {
			message: "Mã chương trình đào tạo đã tồn tại",
		});
	}
}

export const programsRouter = {
	list: permissionProcedure("programs", "read")
		.input(listProgramsSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 10;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.majorId ? eq(program.majorId, input.majorId) : undefined,
				input?.status ? eq(program.status, input.status) : undefined,
				input?.search
					? or(
							ilike(program.code, `%${input.search}%`),
							ilike(program.name, `%${input.search}%`),
						)
					: undefined,
				input?.academicYear ? eq(program.academicYear, input.academicYear) : undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [programRows, totalCount] = await Promise.all([
				db.select().from(program).where(where).offset(offset).limit(limit),
				db.select({ total: count() }).from(program).where(where),
			]);

			const total = totalCount[0]?.total ?? 0;

			return {
				programs: programRows,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	options: permissionProcedure("programs", "read")
		.input(
			z
				.object({
					majorId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const programRows = input?.majorId
				? await db.select().from(program).where(eq(program.majorId, input.majorId))
				: await db.select().from(program);

			return {
				programs: programRows.map((item) => ({
					id: item.id,
					majorId: item.majorId,
					code: item.code,
					name: item.name,
					academicYear: item.academicYear,
					version: item.version,
					status: item.status,
				})),
			};
		}),

	byId: permissionProcedure("programs", "read")
		.input(programIdSchema)
		.handler(async ({ input }) => {
			const existingProgram = await ensureProgramExists(input.programId);
			const [majorItem] = await db
				.select()
				.from(major)
				.where(eq(major.id, existingProgram.majorId));
			const [programCourseRows, studentClassRows, studentRows] = await Promise.all([
				db
					.select({ id: programCourse.id })
					.from(programCourse)
					.where(eq(programCourse.programId, input.programId)),
				db
					.select({ id: studentClass.id })
					.from(studentClass)
					.where(eq(studentClass.programId, input.programId)),
				db
					.select({ id: student.id })
					.from(student)
					.where(eq(student.programId, input.programId)),
			]);

			return {
				program: {
					...existingProgram,
					majorName: majorItem?.name ?? "Không xác định",
					majorCode: majorItem?.code ?? "",
					courseCount: programCourseRows.length,
					studentClassCount: studentClassRows.length,
					studentCount: studentRows.length,
				},
			};
		}),

	create: permissionProcedure("programs", "create")
		.input(createProgramSchema)
		.handler(async ({ input }) => {
			await ensureMajorExists(input.majorId);
			await ensureUniqueProgramCode(input.code);

			const [newProgram] = await db
				.insert(program)
				.values({
					code: input.code,
					name: input.name,
					majorId: input.majorId,
					academicYear: input.academicYear,
					version: input.version,
					totalCredits: input.totalCredits,
				})
				.returning();

			return {
				program: newProgram,
			};
		}),

	update: permissionProcedure("programs", "update")
		.input(updateProgramSchema)
		.handler(async ({ input }) => {
			await ensureProgramExists(input.programId);
			await ensureMajorExists(input.majorId);
			await ensureUniqueProgramCode(input.code, input.programId);

			const [updatedProgram] = await db
				.update(program)
				.set({
					code: input.code,
					name: input.name,
					majorId: input.majorId,
					academicYear: input.academicYear,
					version: input.version,
					totalCredits: input.totalCredits,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(program.id, input.programId))
				.returning();

			return {
				program: updatedProgram,
			};
		}),

	delete: permissionProcedure("programs", "delete")
		.input(programIdSchema)
		.handler(async ({ input }) => {
			await ensureProgramExists(input.programId);

			const [programCourseRows, studentClassRows, studentRows] = await Promise.all([
				db
					.select({ id: programCourse.id })
					.from(programCourse)
					.where(eq(programCourse.programId, input.programId)),
				db
					.select({ id: studentClass.id })
					.from(studentClass)
					.where(eq(studentClass.programId, input.programId)),
				db
					.select({ id: student.id })
					.from(student)
					.where(eq(student.programId, input.programId)),
			]);

			if (
				programCourseRows.length > 0 ||
				studentClassRows.length > 0 ||
				studentRows.length > 0
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Không thể xóa chương trình đào tạo khi vẫn còn học phần, lớp sinh viên hoặc sinh viên liên kết",
				});
			}

			await db.delete(program).where(eq(program.id, input.programId));

			return {
				success: true,
			};
		}),
};
