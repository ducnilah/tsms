import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { academicYear } from "@tsms/db/schema/academicYear";
import { semester } from "@tsms/db/schema/semester";
import { and, count, eq, ilike, ne, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const dateStringSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Vui lòng nhập ngày theo định dạng YYYY-MM-DD")
	.refine((value) => {
		const date = new Date(`${value}T00:00:00`);
		return !Number.isNaN(date.getTime());
	}, "Ngày không hợp lệ");

const academicYearStatusSchema = z.enum(["active", "draft", "locked", "archived"]);

const listAcademicYearsSchema = z
	.object({
		page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
		limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(6),
		search: z.string().trim().optional(),
		status: academicYearStatusSchema.optional(),
	})
	.optional();

const createAcademicYearSchema = z
	.object({
		code: z.string().trim().min(2, "Vui lòng nhập mã năm học tối thiểu 2 ký tự"),
		name: z.string().trim().min(3, "Vui lòng nhập tên năm học tối thiểu 3 ký tự"),
		startDate: dateStringSchema,
		endDate: dateStringSchema,
		status: academicYearStatusSchema.default("active"),
	})
	.refine((data) => data.endDate > data.startDate, {
		message: "Ngày kết thúc phải sau ngày bắt đầu",
		path: ["endDate"],
	});

const updateAcademicYearSchema = createAcademicYearSchema.extend({
	academicYearId: z.number().int().positive("Vui lòng chọn năm học cần cập nhật"),
});

const academicYearIdSchema = z.object({
	academicYearId: z.number().int().positive("Vui lòng chọn năm học cần thao tác"),
});

const changeAcademicYearStatusSchema = z.object({
	academicYearId: z.number().int().positive("Vui lòng chọn năm học cần thao tác"),
	status: academicYearStatusSchema,
});

export async function ensureAcademicYearExists(academicYearId: number) {
	const [existingAcademicYear] = await db
		.select()
		.from(academicYear)
		.where(eq(academicYear.id, academicYearId));

	if (!existingAcademicYear) {
		throw new ORPCError("NOT_FOUND", {
			message: "Năm học không tồn tại",
		});
	}

	return existingAcademicYear;
}

async function ensureAcademicYearCodeUnique(code: string, academicYearId?: number) {
	const conditions = academicYearId
		? and(eq(academicYear.code, code), ne(academicYear.id, academicYearId)) // for update, exclude the current academic year
		: eq(academicYear.code, code); // for create, just check if the code exists

	const [existingAcademicYear] = await db
		.select()
		.from(academicYear)
		.where(conditions);

	if (existingAcademicYear) {
		throw new ORPCError("CONFLICT", {
			message: "Mã năm học đã tồn tại",
		});
	}
}

export const academicYearsRouter = {
	list: permissionProcedure("academic-years", "read")
		.input(listAcademicYearsSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 6;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.status ? eq(academicYear.status, input.status) : undefined,
				input?.search
					? or(
							ilike(academicYear.code, `%${input.search}%`),
							ilike(academicYear.name, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [academicYears, totalRows] = await Promise.all([
				db.select().from(academicYear).where(where).limit(limit).offset(offset),
				db.select({ total: count() }).from(academicYear).where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				academicYears,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	options: permissionProcedure("academic-years", "read").handler(async () => {
		const academicYears = await db.select().from(academicYear);

		return {
			academicYears: academicYears.map((item) => ({
				id: item.id,
				code: item.code,
				name: item.name,
				status: item.status,
			})),
		};
	}),

	byId: permissionProcedure("academic-years", "read")
		.input(academicYearIdSchema)
		.handler(async ({ input }) => {
			const existingAcademicYear = await ensureAcademicYearExists(input.academicYearId);
			const semesterRows = await db
				.select({ id: semester.id })
				.from(semester)
				.where(eq(semester.academicYearId, input.academicYearId));

			return {
				academicYear: {
					...existingAcademicYear,
					semesterCount: semesterRows.length,
				},
			};
		}),

	create: permissionProcedure("academic-years", "create")
		.input(createAcademicYearSchema)
		.handler(async ({ input }) => {
			await ensureAcademicYearCodeUnique(input.code);

			const [newAcademicYear] = await db
				.insert(academicYear)
				.values(input)
				.returning();

			return {
				academicYear: newAcademicYear,
			};
		}),

	update: permissionProcedure("academic-years", "update")
		.input(updateAcademicYearSchema)
		.handler(async ({ input }) => {
			await ensureAcademicYearExists(input.academicYearId);
			await ensureAcademicYearCodeUnique(input.code, input.academicYearId);

			const [updatedAcademicYear] = await db
				.update(academicYear)
				.set({
					code: input.code,
					name: input.name,
					startDate: input.startDate,
					endDate: input.endDate,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(academicYear.id, input.academicYearId))
				.returning();

			return {
				academicYear: updatedAcademicYear,
			};
		}),

	delete: permissionProcedure("academic-years", "delete")
		.input(academicYearIdSchema)
		.handler(async ({ input }) => {
			await ensureAcademicYearExists(input.academicYearId);

			const semesterRows = await db
				.select({ id: semester.id })
				.from(semester)
				.where(eq(semester.academicYearId, input.academicYearId));

			if (semesterRows.length > 0) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Không thể xóa năm học khi vẫn còn học kỳ liên kết",
				});
			}

			await db.delete(academicYear).where(eq(academicYear.id, input.academicYearId));

			return {
				success: true,
			};
		}),

	changeStatus: permissionProcedure("academic-years", "update")
		.input(changeAcademicYearStatusSchema)
		.handler(async ({ input }) => {
			await ensureAcademicYearExists(input.academicYearId);

			const [updatedAcademicYear] = await db
				.update(academicYear)
				.set({
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(academicYear.id, input.academicYearId))
				.returning();

			return {
				academicYear: updatedAcademicYear,
			};
		}),
};
