import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { department } from "@tsms/db/schema/department";
import { faculty } from "@tsms/db/schema/faculty";
import { lecturer } from "@tsms/db/schema/lecturer";
import { and, eq, ne, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const departmentIdSchema = z.object({
    departmentId: z.number().int().positive("Vui lòng chọn bộ môn cần thao tác"),
});

const dobSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Vui lòng nhập ngày sinh theo định dạng YYYY-MM-DD")
	.refine((value) => {
		const date = new Date(`${value}T00:00:00`);
		return !Number.isNaN(date.getTime()) && date < new Date();
	}, "Ngày sinh không hợp lệ");

const createLecturerSchema = z.object({
	name: z.string().trim().min(4, "Vui lòng nhập họ và tên của giảng viên"),
	dob: dobSchema,
	departmentId: z
		.number()
		.int()
		.positive("Vui lòng chọn bộ môn của giảng viên"),
	email: z.string().email("Vui lòng nhập email hợp lệ"),
	phone: z
		.string()
		.trim()
		.min(10, "Vui lòng nhập số điện thoại hợp lệ")
		.max(15, "Số điện thoại quá dài"),
	position: z.string().trim().min(2, "Vui lòng nhập chức vụ của giảng viên"),
});

const updateLecturerSchema = createLecturerSchema.extend({
	lecturerId: z
		.number()
		.int()
		.positive("Vui lòng chọn giảng viên cần cập nhật"),
	status: z.enum(["active", "inactive"]),
});

const lecturerIdSchema = z.object({
	lecturerId: z
		.number()
		.int()
		.positive("Vui lòng chọn giảng viên cần thao tác"),
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
	list: permissionProcedure("lecturers", "read").handler(async () => {
		const [lecturers, departments, faculties] = await Promise.all([
			db.select().from(lecturer),
			db.select().from(department),
			db.select().from(faculty),
		]);

		return {
			lecturers: lecturers.map((item) => {
				const departmentItem =
					departments.find(
						(departmentRow) => departmentRow.id === item.departmentId,
					) ?? null;
				const facultyItem =
					faculties.find(
						(facultyRow) => facultyRow.id === departmentItem?.facultyId,
					) ?? null;

				return {
					...item,
					departmentName: departmentItem?.name ?? "Không xác định",
					departmentCode: departmentItem?.code ?? "",
					facultyName: facultyItem?.name ?? "Không xác định",
					facultyCode: facultyItem?.code ?? "",
				};
			}),
		};
	}),

    listByDepartment: permissionProcedure("lecturers", "read")
        .input(departmentIdSchema)
        .handler(async({ input }) => {
            const lecturers = await db.select().from(lecturer).where(eq(lecturer.departmentId, input.departmentId));

            return {
                lecturers: lecturers,
            }
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
};
