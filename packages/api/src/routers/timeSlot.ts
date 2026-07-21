import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { classSession } from "@tsms/db/schema/classSession";
import { studyShift } from "@tsms/db/schema/studyShift";
import { timeSlot } from "@tsms/db/schema/timeSlot";
import { and, asc, count, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const timeSlotStatusSchema = z.enum(["active", "inactive"]);
const scheduleTypeSchema = z.enum(["lecture", "practice", "integrated"]);
const classTypeSchema = z.union([z.literal(1), z.literal(2)]);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
	message: "Vui lòng nhập giờ theo định dạng HH:mm",
});

const listTimeSlotsSchema = z
	.object({
		page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
		limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(20),
		search: z.string().trim().optional(),
		studyShiftId: z.number().int().positive("Vui lòng chọn buổi học").optional(),
		scheduleType: scheduleTypeSchema.optional(),
		type: classTypeSchema.optional(),
		status: timeSlotStatusSchema.optional(),
	})
	.optional();

const createTimeSlotSchema = z
	.object({
		name: z.string().trim().min(2, "Vui lòng nhập tên tiết học"),
		studyShiftId: z.number().int().positive("Vui lòng chọn buổi học"),
		scheduleType: scheduleTypeSchema,
		startTime: timeSchema,
		endTime: timeSchema,
		type: classTypeSchema,
	})
	.refine((data) => data.endTime > data.startTime, {
		message: "Giờ kết thúc phải sau giờ bắt đầu",
		path: ["endTime"],
	});

const updateTimeSlotSchema = createTimeSlotSchema.extend({
	timeSlotId: z.number().int().positive("Vui lòng chọn tiết học cần cập nhật"),
	status: timeSlotStatusSchema,
});

const timeSlotIdSchema = z.object({
	timeSlotId: z.number().int().positive("Vui lòng chọn tiết học cần thao tác"),
});

const timeSlotIdsSchema = z.object({
	timeSlotIds: z
		.array(z.number().int().positive("Vui lòng chọn tiết học cần thao tác"))
		.min(1, "Vui lòng chọn ít nhất một tiết học cần xóa"),
});

async function ensureStudyShiftExists(studyShiftId: number) {
	const [existingShift] = await db
		.select()
		.from(studyShift)
		.where(eq(studyShift.id, studyShiftId));

	if (!existingShift) {
		throw new ORPCError("NOT_FOUND", {
			message: "Buổi học không tồn tại",
		});
	}

	return existingShift;
}

async function ensureTimeSlotExists(timeSlotId: number) {
	const [existingTimeSlot] = await db
		.select()
		.from(timeSlot)
		.where(eq(timeSlot.id, timeSlotId));

	if (!existingTimeSlot) {
		throw new ORPCError("NOT_FOUND", {
			message: "Tiết học không tồn tại",
		});
	}

	return existingTimeSlot;
}

async function ensureTimeSlotUnique(
	input: z.infer<typeof createTimeSlotSchema>,
	timeSlotId?: number,
) {
	const conditions = [
		eq(timeSlot.name, input.name),
		eq(timeSlot.studyShiftId, input.studyShiftId),
		eq(timeSlot.scheduleType, input.scheduleType),
		eq(timeSlot.startTime, input.startTime),
		eq(timeSlot.endTime, input.endTime),
		eq(timeSlot.type, input.type),
		timeSlotId ? ne(timeSlot.id, timeSlotId) : undefined,
	].filter(Boolean);

	const [existingTimeSlot] = await db
		.select({ id: timeSlot.id })
		.from(timeSlot)
		.where(and(...conditions));

	if (existingTimeSlot) {
		throw new ORPCError("CONFLICT", {
			message: "Tiết học này đã tồn tại",
		});
	}
}

function getScheduleTypeCode(scheduleType: z.infer<typeof scheduleTypeSchema>) {
	if (scheduleType === "lecture") return "LEC";
	if (scheduleType === "practice") return "PRA";
	return "INT";
}

function buildTimeSlotCode(input: z.infer<typeof createTimeSlotSchema>) {
	const period = input.name.match(/\d+/)?.[0]?.padStart(2, "0") ?? "00";
	const classType = input.type === 1 ? "NEW" : "RE";
	const start = input.startTime.replace(":", "");
	const end = input.endTime.replace(":", "");

	return `P${period}-${getScheduleTypeCode(input.scheduleType)}-${classType}-${start}-${end}`;
}

export const timeSlotsRouter = {
	list: permissionProcedure("time-slots", "read")
		.input(listTimeSlotsSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 20;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.studyShiftId ? eq(timeSlot.studyShiftId, input.studyShiftId) : undefined,
				input?.scheduleType ? eq(timeSlot.scheduleType, input.scheduleType) : undefined,
				input?.type ? eq(timeSlot.type, input.type) : undefined,
				input?.status ? eq(timeSlot.status, input.status) : undefined,
				input?.search
					? or(
							ilike(timeSlot.name, `%${input.search}%`),
							ilike(timeSlot.code, `%${input.search}%`),
							ilike(studyShift.name, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);
			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [timeSlots, totalRows] = await Promise.all([
				db
					.select({
						id: timeSlot.id,
						code: timeSlot.code,
						name: timeSlot.name,
						studyShiftId: timeSlot.studyShiftId,
						studyShiftName: studyShift.name,
						scheduleType: timeSlot.scheduleType,
						startTime: timeSlot.startTime,
						endTime: timeSlot.endTime,
						type: timeSlot.type,
						status: timeSlot.status,
					})
					.from(timeSlot)
					.innerJoin(studyShift, eq(timeSlot.studyShiftId, studyShift.id))
					.where(where)
					.orderBy(
						asc(studyShift.startTime),
						asc(timeSlot.startTime),
						asc(timeSlot.name),
						asc(timeSlot.scheduleType),
						asc(timeSlot.type),
					)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(timeSlot)
					.innerJoin(studyShift, eq(timeSlot.studyShiftId, studyShift.id))
					.where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				timeSlots,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	studyShifts: permissionProcedure("time-slots", "read").handler(async () => {
		const studyShifts = await db
			.select({
				id: studyShift.id,
				code: studyShift.code,
				name: studyShift.name,
				startTime: studyShift.startTime,
				endTime: studyShift.endTime,
				status: studyShift.status,
			})
			.from(studyShift)
			.orderBy(asc(studyShift.startTime));

		return { studyShifts };
	}),

	byId: permissionProcedure("time-slots", "read")
		.input(timeSlotIdSchema)
		.handler(async ({ input }) => {
			const existingTimeSlot = await ensureTimeSlotExists(input.timeSlotId);

			return { timeSlot: existingTimeSlot };
		}),

	create: permissionProcedure("time-slots", "create")
		.input(createTimeSlotSchema)
		.handler(async ({ input }) => {
			await ensureStudyShiftExists(input.studyShiftId);
			await ensureTimeSlotUnique(input);

			const [newTimeSlot] = await db
				.insert(timeSlot)
				.values({
					code: buildTimeSlotCode(input),
					name: input.name,
					studyShiftId: input.studyShiftId,
					scheduleType: input.scheduleType,
					startTime: input.startTime,
					endTime: input.endTime,
					type: input.type,
				})
				.returning();

			return { timeSlot: newTimeSlot };
		}),

	update: permissionProcedure("time-slots", "update")
		.input(updateTimeSlotSchema)
		.handler(async ({ input }) => {
			await ensureTimeSlotExists(input.timeSlotId);
			await ensureStudyShiftExists(input.studyShiftId);
			await ensureTimeSlotUnique(input, input.timeSlotId);

			const [updatedTimeSlot] = await db
				.update(timeSlot)
				.set({
					name: input.name,
					studyShiftId: input.studyShiftId,
					scheduleType: input.scheduleType,
					startTime: input.startTime,
					endTime: input.endTime,
					type: input.type,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(timeSlot.id, input.timeSlotId))
				.returning();

			return { timeSlot: updatedTimeSlot };
		}),

	delete: permissionProcedure("time-slots", "delete")
		.input(timeSlotIdsSchema)
		.handler(async ({ input }) => {
			const existingTimeSlots = await db
				.select({ id: timeSlot.id })
				.from(timeSlot)
				.where(inArray(timeSlot.id, input.timeSlotIds));

			if (existingTimeSlots.length !== input.timeSlotIds.length) {
				throw new ORPCError("NOT_FOUND", {
					message: "Một hoặc nhiều tiết học không tồn tại",
				});
			}

			const [linkedSession] = await db
				.select({ id: classSession.id })
				.from(classSession)
				.where(inArray(classSession.timeSlotId, input.timeSlotIds));

			if (linkedSession) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Không thể xóa tiết học đã được sử dụng trong buổi học",
				});
			}

			await db.delete(timeSlot).where(inArray(timeSlot.id, input.timeSlotIds));

			return { success: true, deletedCount: input.timeSlotIds.length };
		}),
};
