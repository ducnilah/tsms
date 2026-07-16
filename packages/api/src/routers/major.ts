import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { faculty } from "@tsms/db/schema/faculty";
import { major } from "@tsms/db/schema/major";
import { program } from "@tsms/db/schema/program";
import { studentClass } from "@tsms/db/schema/studentClass";
import { and, count, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const listMajorsSchema = z.object({
	page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
	limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(6),
	search: z.string().trim().optional(),
	facultyId: z.number().int().positive("Vui lòng chọn khoa").optional(),
	status: z.enum(["active", "inactive"]).optional(),
}).optional();

const createMajorSchema = z.object({
	code: z.string().trim().min(2, "Vui lòng nhập mã ngành tối thiểu 2 ký tự"),
	name: z.string().trim().min(3, "Vui lòng nhập tên ngành tối thiểu 3 ký tự"),
	facultyId: z.number().int().positive("Vui lòng chọn khoa quản lý"),
	description: z.string().trim().nullable().optional(),
});

const updateMajorSchema = createMajorSchema.extend({
	majorId: z.number().int().positive("Vui lòng chọn ngành cần cập nhật"),
	status: z.enum(["active", "inactive"]),
});

const majorIdSchema = z.object({
	majorId: z.number().int().positive("Vui lòng chọn ngành cần thao tác"),
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

async function ensureMajorExists(majorId: number) {
	const [existingMajor] = await db.select().from(major).where(eq(major.id, majorId));

	if (!existingMajor) {
		throw new ORPCError("NOT_FOUND", {
			message: "Ngành không tồn tại",
		});
	}

	return existingMajor;
}

async function ensureUniqueMajorCode(code: string, majorId?: number) {
	const conditions = majorId
		? and(eq(major.code, code), ne(major.id, majorId))
		: eq(major.code, code);
	const [existingMajor] = await db.select().from(major).where(conditions);

	if (existingMajor) {
		throw new ORPCError("CONFLICT", {
			message: "Mã ngành đã tồn tại",
		});
	}
}

export const majorsRouter = {
	list: permissionProcedure("majors", "read")
		.input(listMajorsSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 6;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.facultyId ? eq(major.facultyId, input.facultyId) : undefined,
				input?.status ? eq(major.status, input.status) : undefined,
				input?.search
					? or(
							ilike(major.code, `%${input.search}%`),
							ilike(major.name, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [majorRows, totalCount] = await Promise.all([
				db.select().from(major).where(where).offset(offset).limit(limit),
				db.select({ total: count() }).from(major).where(where),
			]);

			const majorIds = majorRows.map((item) => item.id);

			const programCount = majorIds.length > 0
				? await db
					.select({
						majorId: program.majorId,
						count: count(),
					})
					.from(program)
					.where(inArray(program.majorId, majorIds))
					.groupBy(program.majorId)
				: [];

			const programCountMap = new Map(programCount.map((item) => [item.majorId, item.count]));

			const total = totalCount[0]?.total ?? 0;

			return {
				majors: majorRows.map((item) => ({
					...item,
					programCount: programCountMap.get(item.id) ?? 0,
				})),
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	options: permissionProcedure("majors", "read")
		.input(
			z
				.object({
					facultyId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const majorRows = input?.facultyId
				? await db.select().from(major).where(eq(major.facultyId, input.facultyId))
				: await db.select().from(major);

			return {
				majors: majorRows.map((item) => ({
					id: item.id,
					facultyId: item.facultyId,
					code: item.code,
					name: item.name,
					status: item.status,
				})),
			};
		}),

	byId: permissionProcedure("majors", "read")
		.input(majorIdSchema)
		.handler(async ({ input }) => {
			const existingMajor = await ensureMajorExists(input.majorId);
			const [facultyItem, programRows] = await Promise.all([
				db
					.select()
					.from(faculty)
					.where(eq(faculty.id, existingMajor.facultyId)),
				db
					.select({ 
						id: program.id,
						code: program.code,
						name: program.name,
						status: program.status,
						academicYear: program.academicYear,
						totalCredits: program.totalCredits,
					})
					.from(program)
					.where(eq(program.majorId, input.majorId)),
			]);

			return {
				major: {
					...existingMajor,
					facultyName: facultyItem[0]?.name ?? "Không xác định",
					facultyCode: facultyItem[0]?.code ?? "",
					programCount: programRows.length,
					programs: programRows,
				},
			};
		}),

	create: permissionProcedure("majors", "create")
		.input(createMajorSchema)
		.handler(async ({ input }) => {
			await ensureFacultyExists(input.facultyId);
			await ensureUniqueMajorCode(input.code);

			const [newMajor] = await db
				.insert(major)
				.values({
					code: input.code,
					name: input.name,
					facultyId: input.facultyId,
					description: input.description ?? null,
				})
				.returning();

			return {
				major: newMajor,
			};
		}),

	update: permissionProcedure("majors", "update")
		.input(updateMajorSchema)
		.handler(async ({ input }) => {
			await ensureMajorExists(input.majorId);
			await ensureFacultyExists(input.facultyId);
			await ensureUniqueMajorCode(input.code, input.majorId);

			const [updatedMajor] = await db
				.update(major)
				.set({
					code: input.code,
					name: input.name,
					facultyId: input.facultyId,
					description: input.description ?? null,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(major.id, input.majorId))
				.returning();

			return {
				major: updatedMajor,
			};
		}),

	delete: permissionProcedure("majors", "delete")
		.input(majorIdSchema)
		.handler(async ({ input }) => {
			await ensureMajorExists(input.majorId);

			const [programRows, studentClassRows] = await Promise.all([
				db.select({ id: program.id }).from(program).where(eq(program.majorId, input.majorId)),
				db
					.select({ id: studentClass.id })
					.from(studentClass)
					.where(eq(studentClass.majorId, input.majorId)),
			]);

			if (programRows.length > 0 || studentClassRows.length > 0) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Không thể xóa ngành khi vẫn còn chương trình đào tạo hoặc lớp sinh viên liên kết",
				});
			}

			await db.delete(major).where(eq(major.id, input.majorId));

			return {
				success: true,
			};
		}),

	lock: permissionProcedure("majors", "update")
		.input(majorIdSchema)
		.handler(async ({ input }) => {
			const existingMajor = await ensureMajorExists(input.majorId);

			if (existingMajor.status === "inactive") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Ngành đã bị khóa",
				});
			}

			const [lockedMajor] = await db
				.update(major)
				.set({
					status: "inactive",
					updatedAt: new Date(),
				})
				.where(eq(major.id, input.majorId))
				.returning();

			return {
				major: lockedMajor,
			};
		}),

	unlock: permissionProcedure("majors", "update")
		.input(majorIdSchema)
		.handler(async ({ input }) => {
			const existingMajor = await ensureMajorExists(input.majorId);

			if (existingMajor.status === "active") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Ngành đã được mở khóa",
				});
			}

			const [unlockedMajor] = await db
				.update(major)
				.set({
					status: "active",
					updatedAt: new Date(),
				})
				.where(eq(major.id, input.majorId))
				.returning();

			return {
				major: unlockedMajor,
			};
		}),
};
