import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { academicHoliday } from "@tsms/db/schema/academicHoliday";
import { semester } from "@tsms/db/schema/semester";
import { semesterWeek } from "@tsms/db/schema/semesterWeek";
import { and, count, eq, ilike, ne, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";
import { ensureAcademicYearExists } from "./academicYear";

const dateStringSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Vui lòng nhập ngày theo định dạng YYYY-MM-DD")
	.refine((value) => {
		const date = new Date(`${value}T00:00:00`);
		return !Number.isNaN(date.getTime());
	}, "Ngày không hợp lệ");

const semesterStatusSchema = z.enum(["draft", "open", "locked", "archived"]);
const semesterTypeSchema = z.enum(["regular", "summer"]);

const listSemestersSchema = z
	.object({
		page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
		limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(10),
		search: z.string().trim().optional(),
		academicYearId: z.number().int().positive("Vui lòng chọn năm học").optional(),
		type: semesterTypeSchema.optional(),
		status: semesterStatusSchema.optional(),
	})
	.optional();

const createSemesterSchema = z
	.object({
		academicYearId: z.number().int().positive("Vui lòng chọn năm học"),
		code: z.string().trim().min(2, "Vui lòng nhập mã học kỳ tối thiểu 2 ký tự"),
		name: z.string().trim().min(3, "Vui lòng nhập tên học kỳ tối thiểu 3 ký tự"),
		type: semesterTypeSchema.default("regular"),
		startDate: dateStringSchema,
		endDate: dateStringSchema,
		status: semesterStatusSchema.default("draft"),
	})
	.refine((data) => data.endDate > data.startDate, {
		message: "Ngày kết thúc phải sau ngày bắt đầu",
		path: ["endDate"],
	});

const updateSemesterSchema = createSemesterSchema.extend({
	semesterId: z.number().int().positive("Vui lòng chọn học kỳ cần cập nhật"),
});

const semesterIdSchema = z.object({
	semesterId: z.number().int().positive("Vui lòng chọn học kỳ cần thao tác"),
});

const changeSemesterStatusSchema = z.object({
	semesterId: z.number().int().positive("Vui lòng chọn học kỳ cần thao tác"),
	status: semesterStatusSchema,
});

function addDays(date: Date, days: number) {
	const nextDate = new Date(date);
	nextDate.setDate(nextDate.getDate() + days);
	return nextDate;
}

function toDateString(date: Date) {
	return date.toISOString().slice(0, 10);
}

function buildSemesterWeeks(semesterId: number, startDate: string, endDate: string) {
	const weeks = [];
	let weekNumber = 1;
	let currentStartDate = new Date(`${startDate}T00:00:00`);
	const semesterEndDate = new Date(`${endDate}T00:00:00`);

	while (currentStartDate <= semesterEndDate) {
		const currentEndDate = addDays(currentStartDate, 6);
		const weekEndDate =
			currentEndDate > semesterEndDate ? semesterEndDate : currentEndDate;

		weeks.push({
			semesterId,
			weekNumber,
			startDate: toDateString(currentStartDate),
			endDate: toDateString(weekEndDate),
			isTeachingWeek: true,
			note: "",
		});

		currentStartDate = addDays(weekEndDate, 1);
		weekNumber += 1;
	}

	return weeks;
}

async function generateSemesterWeeks(semesterId: number, startDate: string, endDate: string) {
	const weeks = buildSemesterWeeks(semesterId, startDate, endDate);

	if (weeks.length > 0) {
		await db.insert(semesterWeek).values(weeks);
	}

	return weeks;
}

export async function ensureSemesterExists(semesterId: number) {
	const [existingSemester] = await db
		.select()
		.from(semester)
		.where(eq(semester.id, semesterId));

	if (!existingSemester) {
		throw new ORPCError("NOT_FOUND", {
			message: "Học kỳ không tồn tại",
		});
	}

	return existingSemester;
}

async function ensureSemesterCodeUnique(code: string, semesterId?: number) {
	const conditions = semesterId
		? and(eq(semester.code, code), ne(semester.id, semesterId))
		: eq(semester.code, code);

	const [existingSemester] = await db.select().from(semester).where(conditions);

	if (existingSemester) {
		throw new ORPCError("CONFLICT", {
			message: "Mã học kỳ đã tồn tại",
		});
	}
}

async function ensureSemesterInsideAcademicYear(
	academicYearId: number,
	startDate: string,
	endDate: string,
) {
	const existingAcademicYear = await ensureAcademicYearExists(academicYearId);

	if (
		startDate < existingAcademicYear.startDate ||
		endDate > existingAcademicYear.endDate
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Thời gian học kỳ phải nằm trong khoảng thời gian của năm học",
		});
	}

	return existingAcademicYear;
}

async function ensureSemesterNotOverlapping(
	academicYearId: number,
	startDate: string,
	endDate: string,
	semesterId?: number,
) {
	const semesterRows = await db
		.select()
		.from(semester)
		.where(eq(semester.academicYearId, academicYearId));

	const overlappingSemester = semesterRows.find((item) => {
		if (semesterId && item.id === semesterId) {
			return false;
		}

		return startDate <= item.endDate && endDate >= item.startDate;
	});

	if (overlappingSemester) {
		throw new ORPCError("CONFLICT", {
			message: "Thời gian học kỳ bị trùng với học kỳ khác trong cùng năm học",
		});
	}
}

export const semestersRouter = {
	list: permissionProcedure("semesters", "read")
		.input(listSemestersSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 10;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.academicYearId
					? eq(semester.academicYearId, input.academicYearId)
					: undefined,
				input?.type ? eq(semester.type, input.type) : undefined,
				input?.status ? eq(semester.status, input.status) : undefined,
				input?.search
					? or(
							ilike(semester.code, `%${input.search}%`),
							ilike(semester.name, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [semesters, totalRows] = await Promise.all([
				db.select().from(semester).where(where).limit(limit).offset(offset),
				db.select({ total: count() }).from(semester).where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				semesters,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	options: permissionProcedure("semesters", "read")
		.input(
			z
				.object({
					academicYearId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const semesters = input?.academicYearId
				? await db
						.select()
						.from(semester)
						.where(eq(semester.academicYearId, input.academicYearId))
				: await db.select().from(semester);

			return {
				semesters: semesters.map((item) => ({
					id: item.id,
					academicYearId: item.academicYearId,
					code: item.code,
					name: item.name,
					type: item.type,
					status: item.status,
				})),
			};
		}),

	byId: permissionProcedure("semesters", "read")
		.input(semesterIdSchema)
		.handler(async ({ input }) => {
			const existingSemester = await ensureSemesterExists(input.semesterId);
			const [weekRows, holidayRows] = await Promise.all([
				db
					.select({ id: semesterWeek.id })
					.from(semesterWeek)
					.where(eq(semesterWeek.semesterId, input.semesterId)),
				db
					.select({ id: academicHoliday.id })
					.from(academicHoliday)
					.where(eq(academicHoliday.semesterId, input.semesterId)),
			]);

			return {
				semester: {
					...existingSemester,
					weekCount: weekRows.length,
					holidayCount: holidayRows.length,
				},
			};
		}),

	create: permissionProcedure("semesters", "create")
		.input(createSemesterSchema)
		.handler(async ({ input }) => {
			await ensureSemesterCodeUnique(input.code);
			await ensureSemesterInsideAcademicYear(
				input.academicYearId,
				input.startDate,
				input.endDate,
			);
			await ensureSemesterNotOverlapping(
				input.academicYearId,
				input.startDate,
				input.endDate,
			);

			const [newSemester] = await db.insert(semester).values(input).returning();

			if (!newSemester) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Không thể tạo học kỳ",
				});
			}

			const weeks = await generateSemesterWeeks(
				newSemester.id,
				newSemester.startDate,
				newSemester.endDate,
			);

			return {
				semester: newSemester,
				weeks,
			};
		}),

	update: permissionProcedure("semesters", "update")
		.input(updateSemesterSchema)
		.handler(async ({ input }) => {
			await ensureSemesterExists(input.semesterId);
			await ensureSemesterCodeUnique(input.code, input.semesterId);
			await ensureSemesterInsideAcademicYear(
				input.academicYearId,
				input.startDate,
				input.endDate,
			);
			await ensureSemesterNotOverlapping(
				input.academicYearId,
				input.startDate,
				input.endDate,
				input.semesterId,
			);

			const [updatedSemester] = await db
				.update(semester)
				.set({
					academicYearId: input.academicYearId,
					code: input.code,
					name: input.name,
					type: input.type,
					startDate: input.startDate,
					endDate: input.endDate,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(semester.id, input.semesterId))
				.returning();

			return {
				semester: updatedSemester,
			};
		}),

	delete: permissionProcedure("semesters", "delete")
		.input(semesterIdSchema)
		.handler(async ({ input }) => {
			await ensureSemesterExists(input.semesterId);

			await db.delete(semester).where(eq(semester.id, input.semesterId));

			return {
				success: true,
			};
		}),

	changeStatus: permissionProcedure("semesters", "update")
		.input(changeSemesterStatusSchema)
		.handler(async ({ input }) => {
			await ensureSemesterExists(input.semesterId);

			const [updatedSemester] = await db
				.update(semester)
				.set({ status: input.status, updatedAt: new Date() })
				.where(eq(semester.id, input.semesterId))
				.returning();

			return {
				semester: updatedSemester,
			};
		}),
};
