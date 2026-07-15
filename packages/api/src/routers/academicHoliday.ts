import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { academicHoliday } from "@tsms/db/schema/academicHoliday";
import { and, count, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";
import { ensureAcademicYearExists } from "./academicYear";
import { ensureSemesterExists } from "./semester";

const dateStringSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Vui lòng nhập ngày theo định dạng YYYY-MM-DD")
	.refine((value) => {
		const date = new Date(`${value}T00:00:00`);
		return !Number.isNaN(date.getTime());
	}, "Ngày không hợp lệ");

const holidayTypeSchema = z.enum(["holiday", "event", "exam", "makeup", "break", "other"]);
const holidayStatusSchema = z.enum(["active", "inactive"]);

const listAcademicHolidaysSchema = z
	.object({
		page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
		limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(6),
		search: z.string().trim().optional(),
		academicYearId: z.number().int().positive("Vui lòng chọn năm học").optional(),
		semesterId: z.number().int().positive("Vui lòng chọn học kỳ").optional(),
		type: holidayTypeSchema.optional(),
		status: holidayStatusSchema.optional(),
	})
	.optional();

const createAcademicHolidaySchema = z
	.object({
		academicYearId: z.number().int().positive("Vui lòng chọn năm học"),
		semesterId: z.number().int().positive("Vui lòng chọn học kỳ").optional(),
		name: z.string().trim().min(2, "Vui lòng nhập tên ngày nghỉ/lễ tối thiểu 2 ký tự"),
		type: holidayTypeSchema.default("holiday"),
		startDate: dateStringSchema,
		endDate: dateStringSchema,
		status: holidayStatusSchema.default("active"),
	})
	.refine((data) => data.endDate >= data.startDate, {
		message: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
		path: ["endDate"],
	});

const updateAcademicHolidaySchema = createAcademicHolidaySchema.extend({
	holidayId: z.number().int().positive("Vui lòng chọn ngày nghỉ/lễ cần cập nhật"),
});

const holidayIdSchema = z.object({
	holidayId: z.number().int().positive("Vui lòng chọn ngày nghỉ/lễ cần thao tác"),
});

async function ensureAcademicHolidayExists(holidayId: number) {
	const [existingHoliday] = await db
		.select()
		.from(academicHoliday)
		.where(eq(academicHoliday.id, holidayId));

	if (!existingHoliday) {
		throw new ORPCError("NOT_FOUND", {
			message: "Ngày nghỉ/lễ không tồn tại",
		});
	}

	return existingHoliday;
}

async function ensureAcademicHolidayNameUnique(
	name: string,
	academicYearId: number,
	startDate: string,
	endDate: string,
	holidayId?: number,
) {
	const holidayRows = await db
		.select()
		.from(academicHoliday)
		.where(eq(academicHoliday.academicYearId, academicYearId));

	const existingHoliday = holidayRows.find((item) => {
		if (holidayId && item.id === holidayId) {
			return false;
		}

		return (
			item.name === name &&
			startDate <= item.endDate &&
			endDate >= item.startDate
		);
	});

	if (existingHoliday) {
		throw new ORPCError("CONFLICT", {
			message: "Mốc thời gian này đã tồn tại hoặc bị trùng thời gian",
		});
	}
}

async function ensureHolidayInsideScope(
	academicYearId: number,
	semesterId: number | undefined,
	startDate: string,
	endDate: string,
) {
	const existingAcademicYear = await ensureAcademicYearExists(academicYearId);

	if (
		startDate < existingAcademicYear.startDate ||
		endDate > existingAcademicYear.endDate
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Thời gian ngày nghỉ/lễ phải nằm trong năm học",
		});
	}

	if (!semesterId) {
		return;
	}

	const existingSemester = await ensureSemesterExists(semesterId);

	if (existingSemester.academicYearId !== academicYearId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Học kỳ không thuộc năm học đã chọn",
		});
	}

	if (startDate < existingSemester.startDate || endDate > existingSemester.endDate) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Thời gian ngày nghỉ/lễ phải nằm trong học kỳ đã chọn",
		});
	}
}

export const academicHolidaysRouter = {
	list: permissionProcedure("academic-holidays", "read")
		.input(listAcademicHolidaysSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 6;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.academicYearId
					? eq(academicHoliday.academicYearId, input.academicYearId)
					: undefined,
				input?.semesterId ? eq(academicHoliday.semesterId, input.semesterId) : undefined,
				input?.type ? eq(academicHoliday.type, input.type) : undefined,
				input?.status ? eq(academicHoliday.status, input.status) : undefined,
				input?.search
					? or(
							ilike(academicHoliday.name, `%${input.search}%`),
							ilike(academicHoliday.type, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [holidays, totalRows] = await Promise.all([
				db.select().from(academicHoliday).where(where).limit(limit).offset(offset),
				db.select({ total: count() }).from(academicHoliday).where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				holidays,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	byId: permissionProcedure("academic-holidays", "read")
		.input(holidayIdSchema)
		.handler(async ({ input }) => {
			const holiday = await ensureAcademicHolidayExists(input.holidayId);

			return {
				holiday,
			};
		}),

	create: permissionProcedure("academic-holidays", "create")
		.input(createAcademicHolidaySchema)
		.handler(async ({ input }) => {
			await ensureHolidayInsideScope(
				input.academicYearId,
				input.semesterId,
				input.startDate,
				input.endDate,
			);
			await ensureAcademicHolidayNameUnique(
				input.name,
				input.academicYearId,
				input.startDate,
				input.endDate,
			);

			const [newHoliday] = await db
				.insert(academicHoliday)
				.values({
					academicYearId: input.academicYearId,
					semesterId: input.semesterId,
					name: input.name,
					type: input.type,
					startDate: input.startDate,
					endDate: input.endDate,
					status: input.status,
				})
				.returning();

			return {
				holiday: newHoliday,
			};
		}),

	update: permissionProcedure("academic-holidays", "update")
		.input(updateAcademicHolidaySchema)
		.handler(async ({ input }) => {
			await ensureAcademicHolidayExists(input.holidayId);
			await ensureHolidayInsideScope(
				input.academicYearId,
				input.semesterId,
				input.startDate,
				input.endDate,
			);
			await ensureAcademicHolidayNameUnique(
				input.name,
				input.academicYearId,
				input.startDate,
				input.endDate,
				input.holidayId,
			);

			const [updatedHoliday] = await db
				.update(academicHoliday)
				.set({
					academicYearId: input.academicYearId,
					semesterId: input.semesterId,
					name: input.name,
					type: input.type,
					startDate: input.startDate,
					endDate: input.endDate,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(academicHoliday.id, input.holidayId))
				.returning();

			return {
				holiday: updatedHoliday,
			};
		}),

	delete: permissionProcedure("academic-holidays", "delete")
		.input(holidayIdSchema)
		.handler(async ({ input }) => {
			await ensureAcademicHolidayExists(input.holidayId);

			await db
				.delete(academicHoliday)
				.where(eq(academicHoliday.id, input.holidayId));

			return {
				success: true,
			};
		}),
};
