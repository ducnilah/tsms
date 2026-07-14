import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { department } from "@tsms/db/schema/department";
import { faculty } from "@tsms/db/schema/faculty";
import { lecturer } from "@tsms/db/schema/lecturer";
import { and, count, eq, ne, or, ilike } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const dobSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Vui lòng nhập ngày sinh theo định dạng YYYY-MM-DD")
	.refine((value) => {
		const date = new Date(`${value}T00:00:00`);
		return !Number.isNaN(date.getTime()) && date < new Date();
	}, "Ngày sinh không hợp lệ");

const listLecturersSchema = z.object({
	page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
	limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(10),
	search: z.string().trim().optional(),
	departmentId: z.number().int().positive("Vui lòng chọn bộ môn").optional(),
	facultyId: z.number().int().positive("Vui lòng chọn khoa").optional(),
	status: z.enum(["active", "inactive"]).optional(),
}).optional();

const createLecturerSchema = z.object({
	name: z.string().trim().min(4, "Vui lòng nhập họ và tên của giảng viên"),
	dob: dobSchema,
	departmentId: z.number().int().positive("Vui lòng chọn bộ môn của giảng viên"),
	email: z.string().email("Vui lòng nhập email hợp lệ"),
	phone: z
		.string()
		.trim()
		.min(10, "Vui lòng nhập số điện thoại hợp lệ")
		.max(15, "Số điện thoại quá dài"),
	position: z.string().trim().min(2, "Vui lòng nhập chức vụ của giảng viên"),
});

const updateLecturerSchema = createLecturerSchema.extend({
	lecturerId: z.number().int().positive("Vui lòng chọn giảng viên cần cập nhật"),
	status: z.enum(["active", "inactive"]),
});

const lecturerIdSchema = z.object({
	lecturerId: z.number().int().positive("Vui lòng chọn giảng viên cần thao tác"),
});

async function ensureUniqueFields(
	email: string,
	phone: string,
	lecturerId?: number,
) {
	const conditions = lecturerId
		? and(
				or(eq(lecturer.email, email), eq(lecturer.phone, phone)),
				ne(lecturer.id, lecturerId),
			)
		: or(eq(lecturer.email, email), eq(lecturer.phone, phone));

	const [existingLecturer] = await db.select().from(lecturer).where(conditions);

	if (existingLecturer) {
		throw new ORPCError("CONFLICT", {
			message: "Email hoặc số điện thoại đã tồn tại",
		});
	}
}

async function ensureDepartmentExists(departmentId: number) {
	const [existingDepartment] = await db
		.select()
		.from(department)
		.where(eq(department.id, departmentId));

	if (!existingDepartment) {
		throw new ORPCError("NOT_FOUND", {
			message: "Bộ môn không tồn tại",
		});
	}

	return existingDepartment;
}

async function ensureLecturerExists(lecturerId: number) {
	const [existingLecturer] = await db
		.select()
		.from(lecturer)
		.where(eq(lecturer.id, lecturerId));

	if (!existingLecturer) {
		throw new ORPCError("NOT_FOUND", {
			message: "Giảng viên không tồn tại",
		});
	}

	return existingLecturer;
}

export const lecturersRouter = {
	list: permissionProcedure("lecturers", "read")
		.input(listLecturersSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 10;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.departmentId ? eq(lecturer.departmentId, input.departmentId) : undefined,
				input?.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
				input?.status ? eq(lecturer.status, input.status) : undefined,
				input?.search
					? or(
							ilike(lecturer.name, `%${input.search}%`),
							ilike(lecturer.email, `%${input.search}%`),
							ilike(lecturer.phone, `%${input.search}%`),
					  )
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [lecturerRows, totalRows] = await Promise.all([
				db
					.select({
						id: lecturer.id,
						departmentId: lecturer.departmentId,
						name: lecturer.name,
						email: lecturer.email,
						phone: lecturer.phone,
						position: lecturer.position,
						status: lecturer.status,
					})
					.from(lecturer)
					.innerJoin(department, eq(lecturer.departmentId, department.id))
					.where(where)
					.limit(limit)
					.offset(offset),
				db.select({ total: count() }).from(lecturer).innerJoin(department, eq(lecturer.departmentId, department.id)).where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				lecturers: lecturerRows,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	options: permissionProcedure("lecturers", "read")
		.input(
			z
				.object({
					departmentId: z.number().int().positive().optional(),
					facultyId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const conditions = [
				input?.departmentId ? eq(lecturer.departmentId, input.departmentId) : undefined,
				input?.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
			].filter(Boolean);

			const lecturerRows = await db
				.select({
					id: lecturer.id,
					departmentId: lecturer.departmentId,
					name: lecturer.name,
					email: lecturer.email,
					phone: lecturer.phone,
					position: lecturer.position,
					status: lecturer.status,
				})
				.from(lecturer)
				.innerJoin(department, eq(lecturer.departmentId, department.id))
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			return {
				lecturers: lecturerRows,
			};
		}),

	byId: permissionProcedure("lecturers", "read")
		.input(lecturerIdSchema)
		.handler(async ({ input }) => {
			const existingLecturer = await ensureLecturerExists(input.lecturerId);
			const [departmentItem] = await db
				.select()
				.from(department)
				.where(eq(department.id, existingLecturer.departmentId));
			const [facultyItem] = departmentItem
				? await db
						.select()
						.from(faculty)
						.where(eq(faculty.id, departmentItem.facultyId))
				: [];

			return {
				lecturer: {
					...existingLecturer,
					departmentName: departmentItem?.name ?? "Không xác định",
					departmentCode: departmentItem?.code ?? "",
					facultyName: facultyItem?.name ?? "Không xác định",
					facultyCode: facultyItem?.code ?? "",
				},
			};
		}),

	listByDepartmentFaculty: permissionProcedure("lecturers", "read")
		.input(
			z.object({
				departmentId: z.number().int().positive().optional(),
				facultyId: z.number().int().positive().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const conditions = [
				input.departmentId ? eq(lecturer.departmentId, input.departmentId) : undefined,
				input.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
			].filter(Boolean);

			const lecturers = await db
				.select()
				.from(lecturer)
				.innerJoin(department, eq(lecturer.departmentId, department.id))
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			return {
				lecturers,
			};
		}),

	create: permissionProcedure("lecturers", "create")
		.input(createLecturerSchema)
		.handler(async ({ input }) => {
			await ensureDepartmentExists(input.departmentId);
			await ensureUniqueFields(input.email, input.phone);

			const [newLecturer] = await db
				.insert(lecturer)
				.values({
					name: input.name,
					dob: input.dob,
					email: input.email,
					phone: input.phone,
					departmentId: input.departmentId,
					position: input.position,
				})
				.returning();

			return {
				lecturer: newLecturer,
			};
		}),

	update: permissionProcedure("lecturers", "update")
		.input(updateLecturerSchema)
		.handler(async ({ input }) => {
			await ensureLecturerExists(input.lecturerId);
			await ensureDepartmentExists(input.departmentId);
			await ensureUniqueFields(input.email, input.phone, input.lecturerId);

			const [updatedLecturer] = await db
				.update(lecturer)
				.set({
					name: input.name,
					dob: input.dob,
					email: input.email,
					phone: input.phone,
					departmentId: input.departmentId,
					position: input.position,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(lecturer.id, input.lecturerId))
				.returning();

			return {
				lecturer: updatedLecturer,
			};
		}),

	delete: permissionProcedure("lecturers", "delete")
		.input(lecturerIdSchema)
		.handler(async ({ input }) => {
			await ensureLecturerExists(input.lecturerId);

			await db.delete(lecturer).where(eq(lecturer.id, input.lecturerId));

			return {
				success: true,
			};
		}),

	lock: permissionProcedure("lecturers", "update")
		.input(lecturerIdSchema)
		.handler(async ({ input }) => {
			const existingLecturer = await ensureLecturerExists(input.lecturerId);

			if (existingLecturer.status === "inactive") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Giảng viên đã bị khóa",
				});
			}

			const [lockedLecturer] = await db
				.update(lecturer)
				.set({
					status: "inactive",
					updatedAt: new Date(),
				})
				.where(eq(lecturer.id, input.lecturerId))
				.returning();

			return {
				lecturer: lockedLecturer,
			};
		}),

	unlock: permissionProcedure("lecturers", "update")
		.input(lecturerIdSchema)
		.handler(async ({ input }) => {
			const existingLecturer = await ensureLecturerExists(input.lecturerId);

			if (existingLecturer.status === "active") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Giảng viên đã được mở khóa",
				});
			}

			const [unlockedLecturer] = await db
				.update(lecturer)
				.set({
					status: "active",
					updatedAt: new Date(),
				})
				.where(eq(lecturer.id, input.lecturerId))
				.returning();

			return {
				lecturer: unlockedLecturer,
			};
		}),
};
