import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { classroom } from "@tsms/db/schema/classroom";
import { classSession } from "@tsms/db/schema/classSession";
import { course } from "@tsms/db/schema/course";
import { courseClass } from "@tsms/db/schema/courseClass";
import { department } from "@tsms/db/schema/department";
import { faculty } from "@tsms/db/schema/faculty";
import { lecturer } from "@tsms/db/schema/lecturer";
import { semesterWeek } from "@tsms/db/schema/semesterWeek";
import { studentClass } from "@tsms/db/schema/studentClass";
import { timeSlot } from "@tsms/db/schema/timeSlot";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const sessionTypeSchema = z.enum(["lecture", "lab", "practice", "exam"]);
const sessionStatusSchema = z.enum(["active", "cancelled", "completed"]);

const listClassSessionsSchema = z
	.object({
		page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
		limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(6),
		semesterId: z.number().int().positive("Vui lòng chọn học kỳ").optional(),
		semesterWeekId: z.number().int().positive("Vui lòng chọn tuần học").optional(),
		courseClassId: z.number().int().positive("Vui lòng chọn lớp học phần").optional(),
		facultyId: z.number().int().positive("Vui lòng chọn khoa").optional(),
		departmentId: z.number().int().positive("Vui lòng chọn bộ môn").optional(),
		lecturerId: z.number().int().positive("Vui lòng chọn giảng viên").optional(),
		studentClassId: z.number().int().positive("Vui lòng chọn lớp sinh viên").optional(),
		classroomId: z.number().int().positive("Vui lòng chọn phòng học").optional(),
		dayOfWeek: z.number().int().min(1).max(7).optional(),
		status: sessionStatusSchema.optional(),
	})
	.optional();

const createClassSessionSchema = z.object({
	courseClassId: z.number().int().positive("Vui lòng chọn lớp học phần"),
	semesterWeekId: z.number().int().positive("Vui lòng chọn tuần học"),
	dayOfWeek: z.number().int().min(1, "Thứ trong tuần phải từ 1").max(7, "Thứ trong tuần tối đa là 7"),
	timeSlotId: z.number().int().positive("Vui lòng chọn tiết học"),
	classroomId: z.number().int().positive("Vui lòng chọn phòng học"),
	sessionType: sessionTypeSchema.default("lecture"),
	status: sessionStatusSchema.default("active"),
	note: z.string().trim().default(""),
});

const updateClassSessionSchema = createClassSessionSchema.extend({
	classSessionId: z.number().int().positive("Vui lòng chọn buổi học"),
});

const classSessionIdSchema = z.object({
	classSessionId: z.number().int().positive("Vui lòng chọn buổi học"),
});

const byCourseClassSchema = z.object({
	courseClassId: z.number().int().positive("Vui lòng chọn lớp học phần"),
});

const weeklyViewSchema = z.object({
	semesterId: z.number().int().positive("Vui lòng chọn học kỳ"),
	semesterWeekId: z.number().int().positive("Vui lòng chọn tuần học"),
	facultyId: z.number().int().positive("Vui lòng chọn khoa").optional(),
	departmentId: z.number().int().positive("Vui lòng chọn bộ môn").optional(),
	lecturerId: z.number().int().positive("Vui lòng chọn giảng viên").optional(),
	studentClassId: z.number().int().positive("Vui lòng chọn lớp sinh viên").optional(),
	classroomId: z.number().int().positive("Vui lòng chọn phòng học").optional(),
});

function addDays(date: Date, days: number) {
	const nextDate = new Date(date);
	nextDate.setDate(nextDate.getDate() + days);
	return nextDate;
}

function toDateString(date: Date) {
	return date.toISOString().slice(0, 10);
}

function buildScheduleDate(week: { startDate: string; endDate: string }, dayOfWeek: number) {
	const scheduleDate = addDays(new Date(`${week.startDate}T00:00:00`), dayOfWeek - 1);
	const scheduleDateString = toDateString(scheduleDate);

	if (scheduleDateString > week.endDate) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Ngày học vượt quá phạm vi tuần học",
		});
	}

	return scheduleDateString;
}

async function ensureClassSessionExists(classSessionId: number) {
	const [existingSession] = await db
		.select()
		.from(classSession)
		.where(eq(classSession.id, classSessionId));

	if (!existingSession) {
		throw new ORPCError("NOT_FOUND", {
			message: "Buổi học không tồn tại",
		});
	}

	return existingSession;
}

async function getSchedulingContext(input: {
	courseClassId: number;
	semesterWeekId: number;
	timeSlotId: number;
	classroomId: number;
	dayOfWeek: number;
}) {
	const [courseClassRows, weekRows, timeSlotRows, classroomRows] =
		await Promise.all([
			db.select().from(courseClass).where(eq(courseClass.id, input.courseClassId)),
			db.select().from(semesterWeek).where(eq(semesterWeek.id, input.semesterWeekId)),
			db.select().from(timeSlot).where(eq(timeSlot.id, input.timeSlotId)),
			db.select().from(classroom).where(eq(classroom.id, input.classroomId)),
		]);

	const courseClassItem = courseClassRows[0];
	const weekItem = weekRows[0];
	const timeSlotItem = timeSlotRows[0];
	const classroomItem = classroomRows[0];

	if (!courseClassItem) {
		throw new ORPCError("NOT_FOUND", { message: "Lớp học phần không tồn tại" });
	}

	if (!weekItem) {
		throw new ORPCError("NOT_FOUND", { message: "Tuần học không tồn tại" });
	}

	if (!timeSlotItem) {
		throw new ORPCError("NOT_FOUND", { message: "Tiết học không tồn tại" });
	}

	if (!classroomItem) {
		throw new ORPCError("NOT_FOUND", { message: "Phòng học không tồn tại" });
	}

	if (weekItem.semesterId !== courseClassItem.semesterId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Tuần học không thuộc học kỳ của lớp học phần",
		});
	}

	if (!weekItem.isTeachingWeek) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Không thể xếp lịch vào tuần không học",
		});
	}

	if (classroomItem.capacity < courseClassItem.expectedStudents) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Phòng học không đủ sức chứa cho lớp học phần",
		});
	}

	return {
		courseClassItem,
		weekItem,
		scheduleDate: buildScheduleDate(weekItem, input.dayOfWeek),
	};
}

async function ensureNoSessionConflicts(input: {
	classSessionId?: number;
	courseClassId: number;
	semesterWeekId: number;
	dayOfWeek: number;
	timeSlotId: number;
	classroomId: number;
}) {
	const [currentCourseClass] = await db
		.select()
		.from(courseClass)
		.where(eq(courseClass.id, input.courseClassId));

	if (!currentCourseClass) {
		throw new ORPCError("NOT_FOUND", { message: "Lớp học phần không tồn tại" });
	}

	const baseConditions = [
		eq(classSession.semesterWeekId, input.semesterWeekId),
		eq(classSession.dayOfWeek, input.dayOfWeek),
		eq(classSession.timeSlotId, input.timeSlotId),
		ne(classSession.status, "cancelled"),
		input.classSessionId ? ne(classSession.id, input.classSessionId) : undefined,
	].filter(Boolean);

	const [roomConflict] = await db
		.select({ id: classSession.id })
		.from(classSession)
		.where(and(...baseConditions, eq(classSession.classroomId, input.classroomId)));

	if (roomConflict) {
		throw new ORPCError("CONFLICT", {
			message: "Phòng học đã có lịch ở tiết này",
		});
	}

	const [lecturerConflict] = await db
		.select({ id: classSession.id })
		.from(classSession)
		.innerJoin(courseClass, eq(classSession.courseClassId, courseClass.id))
		.where(and(...baseConditions, eq(courseClass.lecturerId, currentCourseClass.lecturerId)));

	if (lecturerConflict) {
		throw new ORPCError("CONFLICT", {
			message: "Giảng viên đã có lịch ở tiết này",
		});
	}

	const [studentClassConflict] = await db
		.select({ id: classSession.id })
		.from(classSession)
		.innerJoin(courseClass, eq(classSession.courseClassId, courseClass.id))
		.where(
			and(
				...baseConditions,
				eq(courseClass.studentClassId, currentCourseClass.studentClassId),
			),
		);

	if (studentClassConflict) {
		throw new ORPCError("CONFLICT", {
			message: "Lớp sinh viên đã có lịch ở tiết này",
		});
	}
}

function getSessionSelect() {
	return {
		id: classSession.id,
		semesterId: classSession.semesterId,
		semesterWeekId: classSession.semesterWeekId,
		scheduleDate: classSession.scheduleDate,
		courseClassId: classSession.courseClassId,
		dayOfWeek: classSession.dayOfWeek,
		timeSlotId: classSession.timeSlotId,
		classroomId: classSession.classroomId,
		sessionType: classSession.sessionType,
		note: classSession.note,
		status: classSession.status,
		timeSlotCode: timeSlot.code,
		timeSlotName: timeSlot.name,
		startTime: timeSlot.startTime,
		endTime: timeSlot.endTime,
		classroomCode: classroom.code,
		courseCode: course.code,
		courseName: course.name,
		departmentId: department.id,
		departmentName: department.name,
		facultyId: faculty.id,
		facultyName: faculty.name,
		studentClassId: studentClass.id,
		studentClassCode: studentClass.code,
		studentClassName: studentClass.name,
		lecturerId: lecturer.id,
		lecturerName: lecturer.name,
	};
}

function applySessionJoins(query: any) {
	return query
		.innerJoin(courseClass, eq(classSession.courseClassId, courseClass.id))
		.innerJoin(course, eq(courseClass.courseId, course.id))
		.innerJoin(department, eq(course.departmentId, department.id))
		.innerJoin(faculty, eq(department.facultyId, faculty.id))
		.innerJoin(studentClass, eq(courseClass.studentClassId, studentClass.id))
		.innerJoin(lecturer, eq(courseClass.lecturerId, lecturer.id))
		.innerJoin(timeSlot, eq(classSession.timeSlotId, timeSlot.id))
		.innerJoin(classroom, eq(classSession.classroomId, classroom.id));
}

export const classSessionsRouter = {
	list: permissionProcedure("class-sessions", "read")
		.input(listClassSessionsSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 6;
			const offset = (page - 1) * limit;
			const conditions = [
				input?.semesterId ? eq(classSession.semesterId, input.semesterId) : undefined,
				input?.semesterWeekId
					? eq(classSession.semesterWeekId, input.semesterWeekId)
					: undefined,
				input?.courseClassId
					? eq(classSession.courseClassId, input.courseClassId)
					: undefined,
				input?.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
				input?.departmentId ? eq(course.departmentId, input.departmentId) : undefined,
				input?.lecturerId ? eq(courseClass.lecturerId, input.lecturerId) : undefined,
				input?.studentClassId
					? eq(courseClass.studentClassId, input.studentClassId)
					: undefined,
				input?.classroomId ? eq(classSession.classroomId, input.classroomId) : undefined,
				input?.dayOfWeek ? eq(classSession.dayOfWeek, input.dayOfWeek) : undefined,
				input?.status ? eq(classSession.status, input.status) : undefined,
			].filter(Boolean);
			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [sessions, totalRows] = await Promise.all([
				applySessionJoins(
					db.select(getSessionSelect()).from(classSession),
				)
					.where(where)
					.limit(limit)
					.offset(offset),
				applySessionJoins(
					db.select({ total: count() }).from(classSession),
				).where(where),
			]);
			const total = totalRows[0]?.total ?? 0;

			return {
				sessions: sessions.map((item: any) => ({
					...item,
					courseClassCode: `${item.courseCode}-${item.studentClassCode}`,
				})),
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	byCourseClass: permissionProcedure("class-sessions", "read")
		.input(byCourseClassSchema)
		.handler(async ({ input }) => {
			const sessions = await applySessionJoins(
				db.select(getSessionSelect()).from(classSession),
			)
				.where(eq(classSession.courseClassId, input.courseClassId));

			return {
				sessions: sessions.map((item: any) => ({
					...item,
					courseClassCode: `${item.courseCode}-${item.studentClassCode}`,
				})),
			};
		}),

	weeklyView: permissionProcedure("class-sessions", "read")
		.input(weeklyViewSchema)
		.handler(async ({ input }) => {
			const conditions = [
				eq(classSession.semesterId, input.semesterId),
				eq(classSession.semesterWeekId, input.semesterWeekId),
				input.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
				input.departmentId ? eq(course.departmentId, input.departmentId) : undefined,
				input.lecturerId ? eq(courseClass.lecturerId, input.lecturerId) : undefined,
				input.studentClassId
					? eq(courseClass.studentClassId, input.studentClassId)
					: undefined,
				input.classroomId ? eq(classSession.classroomId, input.classroomId) : undefined,
			].filter(Boolean);

			const sessions = await applySessionJoins(
				db.select(getSessionSelect()).from(classSession),
			).where(and(...conditions));

			return {
				sessions: sessions.map((item: any) => ({
					...item,
					courseClassCode: `${item.courseCode}-${item.studentClassCode}`,
				})),
			};
		}),

	create: permissionProcedure("class-sessions", "create")
		.input(createClassSessionSchema)
		.handler(async ({ input }) => {
			const { courseClassItem, scheduleDate } = await getSchedulingContext(input);
			await ensureNoSessionConflicts(input);

			const [newSession] = await db
				.insert(classSession)
				.values({
					semesterId: courseClassItem.semesterId,
					semesterWeekId: input.semesterWeekId,
					scheduleDate,
					courseClassId: input.courseClassId,
					dayOfWeek: input.dayOfWeek,
					timeSlotId: input.timeSlotId,
					classroomId: input.classroomId,
					sessionType: input.sessionType,
					status: input.status,
					note: input.note,
				})
				.returning();

			return {
				session: newSession,
			};
		}),

	update: permissionProcedure("class-sessions", "update")
		.input(updateClassSessionSchema)
		.handler(async ({ input }) => {
			await ensureClassSessionExists(input.classSessionId);
			const { courseClassItem, scheduleDate } = await getSchedulingContext(input);
			await ensureNoSessionConflicts(input);

			const [updatedSession] = await db
				.update(classSession)
				.set({
					semesterId: courseClassItem.semesterId,
					semesterWeekId: input.semesterWeekId,
					scheduleDate,
					courseClassId: input.courseClassId,
					dayOfWeek: input.dayOfWeek,
					timeSlotId: input.timeSlotId,
					classroomId: input.classroomId,
					sessionType: input.sessionType,
					status: input.status,
					note: input.note,
					updatedAt: new Date(),
				})
				.where(eq(classSession.id, input.classSessionId))
				.returning();

			return {
				session: updatedSession,
			};
		}),

	delete: permissionProcedure("class-sessions", "delete")
		.input(classSessionIdSchema)
		.handler(async ({ input }) => {
			await ensureClassSessionExists(input.classSessionId);
			await db.delete(classSession).where(eq(classSession.id, input.classSessionId));

			return {
				success: true,
			};
		}),
};
