import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { faculty } from "@tsms/db/schema/faculty";
import { major } from "@tsms/db/schema/major";
import { program } from "@tsms/db/schema/program";
import { student } from "@tsms/db/schema/student";
import { studentClass } from "@tsms/db/schema/studentClass";
import { and, count, eq, ne, or, ilike } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const listStudentsSchema = z.object({
	page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
	limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(6),
	search: z.string().trim().optional(),
	classId: z.number().int().positive("Vui lòng chọn lớp sinh viên").optional(),
	programId: z.number().int().positive("Vui lòng chọn chương trình đào tạo").optional(),
	facultyId: z.number().int().positive("Vui lòng chọn khoa").optional(),
	majorId: z.number().int().positive("Vui lòng chọn ngành").optional(),
	status: z.enum(["active", "inactive"]).optional(),
}).optional();

const dobSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Vui lòng nhập ngày sinh theo định dạng YYYY-MM-DD")
	.refine((value) => {
		const date = new Date(`${value}T00:00:00`);
		return !Number.isNaN(date.getTime()) && date < new Date();
	}, "Ngày sinh không hợp lệ");

const createStudentSchema = z.object({
	studentCode: z.string().trim().min(2, "Vui lòng nhập mã sinh viên tối thiểu 2 ký tự"),
	name: z.string().trim().min(3, "Vui lòng nhập họ và tên sinh viên"),
	dob: dobSchema,
	email: z.string().trim().email("Vui lòng nhập email hợp lệ"),
	phone: z
		.string()
		.trim()
		.min(10, "Vui lòng nhập số điện thoại hợp lệ")
		.max(15, "Số điện thoại quá dài"),
	classId: z.number().int().positive("Vui lòng chọn lớp sinh viên"),
	programId: z.number().int().positive("Vui lòng chọn chương trình đào tạo"),
});

const updateStudentSchema = createStudentSchema.extend({
	studentId: z.number().int().positive("Vui lòng chọn sinh viên cần cập nhật"),
	status: z.enum(["active", "inactive"]),
});

const studentIdSchema = z.object({
	studentId: z.number().int().positive("Vui lòng chọn sinh viên cần thao tác"),
});

const importStudentRowSchema = z.object({
	studentCode: z.string().trim().min(2, "Vui lòng nhập mã sinh viên"),
	name: z.string().trim().min(3, "Vui lòng nhập họ và tên sinh viên"),
	dob: dobSchema,
	email: z.string().trim().email("Vui lòng nhập email hợp lệ"),
	phone: z.string().trim().min(10, "Vui lòng nhập số điện thoại hợp lệ"),
	className: z.string().trim().min(1, "Vui lòng nhập tên lớp sinh viên"),
	status: z.enum(["active", "inactive"]).default("active"),
});

const importStudentsRowsSchema = z.object({
	rows: z.array(importStudentRowSchema).min(1, "Vui lòng nhập ít nhất 1 sinh viên"),
});

function formatDate(value: Date | string) {
	const date = value instanceof Date ? value : new Date(value);
	return date.toISOString().slice(0, 10);
}

async function ensureStudentExists(studentId: number) {
	const [existingStudent] = await db.select().from(student).where(eq(student.id, studentId));

	if (!existingStudent) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sinh viên không tồn tại",
		});
	}

	return existingStudent;
}

async function ensureStudentClassExists(classId: number) {
	const [existingClass] = await db
		.select()
		.from(studentClass)
		.where(eq(studentClass.id, classId));

	if (!existingClass) {
		throw new ORPCError("NOT_FOUND", {
			message: "Lớp sinh viên không tồn tại",
		});
	}

	return existingClass;
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

async function ensureUniqueStudentFields(
	studentCode: string,
	email: string,
	phone: string,
	studentId?: number,
) {
	const conditions = studentId
		? and(
				or(
					eq(student.studentCode, studentCode),
					eq(student.email, email),
					eq(student.phone, phone),
				),
				ne(student.id, studentId),
			)
		: or(
				eq(student.studentCode, studentCode),
				eq(student.email, email),
				eq(student.phone, phone),
			);

	const [existingStudent] = await db.select().from(student).where(conditions);

	if (existingStudent) {
		throw new ORPCError("CONFLICT", {
			message: "Mã sinh viên, email hoặc số điện thoại đã tồn tại",
		});
	}
}

export const studentsRouter = {
	list: permissionProcedure("students", "read")
		.input(listStudentsSchema)
		.handler(async ({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 6;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.classId ? eq(student.classId, input.classId) : undefined,
				input?.programId ? eq(student.programId, input.programId) : undefined,
				input?.facultyId ? eq(studentClass.facultyId, input.facultyId) : undefined,
				input?.majorId ? eq(studentClass.majorId, input.majorId) : undefined,
				input?.status ? eq(student.status, input.status) : undefined,
				input?.search
					? or(
							ilike(student.studentCode, `%${input.search}%`),
							ilike(student.name, `%${input.search}%`),
							ilike(student.email, `%${input.search}%`),
							ilike(student.phone, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [studentRows, totalCount] = await Promise.all([
				db
					.select({
						id: student.id,
						studentCode: student.studentCode,
						name: student.name,
						dob: student.dob,
						email: student.email,
						phone: student.phone,
						classId: student.classId,
						programId: student.programId,
						status: student.status,
					})
					.from(student)
					.innerJoin(studentClass, eq(student.classId, studentClass.id))
					.where(where)
					.limit(limit)
					.offset(offset),
				db
					.select({
						total: count(student.id),
					})
					.from(student)
					.innerJoin(studentClass, eq(student.classId, studentClass.id))
					.where(where),
			]);

			const total = totalCount[0]?.total ?? 0;

			return {
				students: studentRows,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		}),

	exportRows: permissionProcedure("students", "read")
		.input(listStudentsSchema)
		.handler(async ({ input }) => {
			const conditions = [
				input?.classId ? eq(student.classId, input.classId) : undefined,
				input?.programId ? eq(student.programId, input.programId) : undefined,
				input?.facultyId ? eq(studentClass.facultyId, input.facultyId) : undefined,
				input?.majorId ? eq(studentClass.majorId, input.majorId) : undefined,
				input?.status ? eq(student.status, input.status) : undefined,
				input?.search
					? or(
							ilike(student.studentCode, `%${input.search}%`),
							ilike(student.name, `%${input.search}%`),
							ilike(student.email, `%${input.search}%`),
							ilike(student.phone, `%${input.search}%`),
						)
					: undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;
			const rows = await db
				.select({
					studentCode: student.studentCode,
					name: student.name,
					dob: student.dob,
					email: student.email,
					phone: student.phone,
					className: studentClass.name,
					status: student.status,
				})
				.from(student)
				.innerJoin(studentClass, eq(student.classId, studentClass.id))
				.where(where);

			return {
				rows: rows.map((row) => ({
					studentCode: row.studentCode,
					name: row.name,
					dob: formatDate(row.dob),
					email: row.email,
					phone: row.phone,
					className: row.className,
					status: row.status,
				})),
			};
		}),


	options: permissionProcedure("students", "read")
		.input(
			z
				.object({
					classId: z.number().int().positive().optional(),
					programId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const conditions = [
				input?.classId ? eq(student.classId, input.classId) : undefined,
				input?.programId ? eq(student.programId, input.programId) : undefined,
			].filter(Boolean);

			const studentRows = await db
				.select()
				.from(student)
				.where(conditions.length > 0 ? and(...conditions) : undefined);

			return {
				students: studentRows.map((item) => ({
					id: item.id,
					studentCode: item.studentCode,
					name: item.name,
					classId: item.classId,
					programId: item.programId,
					status: item.status,
				})),
			};
		}),

	byId: permissionProcedure("students", "read")
		.input(studentIdSchema)
		.handler(async ({ input }) => {
			const existingStudent = await ensureStudentExists(input.studentId);
			const [classRows, programRows] = await Promise.all([
				db.select().from(studentClass).where(eq(studentClass.id, existingStudent.classId)),
				db.select().from(program).where(eq(program.id, existingStudent.programId)),
			]);
			const classItem = classRows[0] ?? null;
			const programItem = programRows[0] ?? null;
			const [majorRows, facultyRows] = await Promise.all([
				programItem
					? db.select().from(major).where(eq(major.id, programItem.majorId))
					: Promise.resolve([]),
				classItem
					? db.select().from(faculty).where(eq(faculty.id, classItem.facultyId))
					: Promise.resolve([]),
			]);
			const majorItem = majorRows[0] ?? null;
			const facultyItem = facultyRows[0] ?? null;

			return {
				student: {
					...existingStudent,
					classCode: classItem?.code ?? "",
					className: classItem?.name ?? "Không xác định",
					programCode: programItem?.code ?? "",
					programName: programItem?.name ?? "Không xác định",
					majorName: majorItem?.name ?? "Không xác định",
					facultyName: facultyItem?.name ?? "Không xác định",
				},
			};
		}),

	importRows: permissionProcedure("students", "create")
		.input(importStudentsRowsSchema)
		.handler(async ({ input }) => {
			const parsedRows = input.rows.map((row, index) => ({
				lineNumber: index + 2,
				row,
			}));
			const [classRows, existingStudents] = await Promise.all([
				db.select().from(studentClass),
				db.select().from(student),
			]);
			const classByName = new Map(classRows.map((item) => [item.name, item]));
			const studentByCode = new Map(
				existingStudents.map((item) => [item.studentCode, item]),
			);
			const errors: string[] = [];
			const seenStudentCodes = new Set<string>();
			const seenEmails = new Set<string>();
			const seenPhones = new Set<string>();
			const normalizedRows = parsedRows.map(({ lineNumber, row }) => {
				const studentCode = String(row.studentCode ?? "").trim();
				const name = String(row.name ?? "").trim();
				const dob = String(row.dob ?? "").trim();
				const email = String(row.email ?? "").trim();
				const phone = String(row.phone ?? "").trim();
				const className = String(row.className ?? "").trim();
				const status = String(row.status ?? "active").trim() || "active";
				const classItem = classByName.get(className);
				const existingStudent = studentByCode.get(studentCode);

				if (seenStudentCodes.has(studentCode)) {
					errors.push(`Dòng ${lineNumber}: mã sinh viên bị trùng trong file`);
				}
				if (seenEmails.has(email)) {
					errors.push(`Dòng ${lineNumber}: email bị trùng trong file`);
				}
				if (seenPhones.has(phone)) {
					errors.push(`Dòng ${lineNumber}: số điện thoại bị trùng trong file`);
				}

				seenStudentCodes.add(studentCode);
				seenEmails.add(email);
				seenPhones.add(phone);

				const baseValidation = createStudentSchema.safeParse({
					studentCode,
					name,
					dob,
					email,
					phone,
					classId: classItem?.id ?? 0,
					programId: classItem?.programId ?? 0,
				});

				if (!baseValidation.success) {
					errors.push(
						`Dòng ${lineNumber}: ${baseValidation.error.issues[0]?.message ?? "Dữ liệu không hợp lệ"}`,
					);
				}

				if (status !== "active" && status !== "inactive") {
					errors.push(`Dòng ${lineNumber}: trạng thái chỉ được là active hoặc inactive`);
				}

				if (!classItem) {
					errors.push(`Dòng ${lineNumber}: không tìm thấy lớp ${className}`);
				}

				return {
					lineNumber,
					studentCode,
					name,
					dob,
					email,
					phone,
					classId: classItem?.id ?? 0,
					programId: classItem?.programId ?? 0,
					status: status as "active" | "inactive",
					existingStudent,
				};
			});

			for (const item of normalizedRows) {
				const duplicate = existingStudents.find(
					(existingStudent) =>
						(existingStudent.email === item.email ||
							existingStudent.phone === item.phone) &&
						existingStudent.id !== item.existingStudent?.id,
				);

				if (duplicate) {
					errors.push(
						`Dòng ${item.lineNumber}: email hoặc số điện thoại đã tồn tại trong hệ thống`,
					);
				}
			}

			if (errors.length > 0) {
				throw new ORPCError("BAD_REQUEST", {
					message: errors.slice(0, 5).join("; "),
				});
			}

			let created = 0;
			let updated = 0;

			for (const item of normalizedRows) {
				if (item.existingStudent) {
					await db
						.update(student)
						.set({
							name: item.name,
							dob: new Date(`${item.dob}T00:00:00`),
							email: item.email,
							phone: item.phone,
							classId: item.classId,
							programId: item.programId,
							status: item.status,
							updatedAt: new Date(),
						})
						.where(eq(student.id, item.existingStudent.id));
					updated++;
					continue;
				}

				await db.insert(student).values({
					studentCode: item.studentCode,
					name: item.name,
					dob: new Date(`${item.dob}T00:00:00`),
					email: item.email,
					phone: item.phone,
					classId: item.classId,
					programId: item.programId,
					status: item.status,
				});
				created++;
			}

			return {
				created,
				updated,
				total: normalizedRows.length,
			};
		}),

	create: permissionProcedure("students", "create")
		.input(createStudentSchema)
		.handler(async ({ input }) => {
			await ensureStudentClassExists(input.classId);
			await ensureProgramExists(input.programId);
			await ensureUniqueStudentFields(input.studentCode, input.email, input.phone);

			const [newStudent] = await db
				.insert(student)
				.values({
					studentCode: input.studentCode,
					name: input.name,
					dob: new Date(`${input.dob}T00:00:00`),
					email: input.email,
					phone: input.phone,
					classId: input.classId,
					programId: input.programId,
				})
				.returning();

			return {
				student: newStudent,
			};
		}),

	update: permissionProcedure("students", "update")
		.input(updateStudentSchema)
		.handler(async ({ input }) => {
			await ensureStudentExists(input.studentId);
			await ensureStudentClassExists(input.classId);
			await ensureProgramExists(input.programId);
			await ensureUniqueStudentFields(
				input.studentCode,
				input.email,
				input.phone,
				input.studentId,
			);

			const [updatedStudent] = await db
				.update(student)
				.set({
					studentCode: input.studentCode,
					name: input.name,
					dob: new Date(`${input.dob}T00:00:00`),
					email: input.email,
					phone: input.phone,
					classId: input.classId,
					programId: input.programId,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(student.id, input.studentId))
				.returning();

			return {
				student: updatedStudent,
			};
		}),

	delete: permissionProcedure("students", "delete")
		.input(studentIdSchema)
		.handler(async ({ input }) => {
			await ensureStudentExists(input.studentId);

			await db.delete(student).where(eq(student.id, input.studentId));

			return {
				success: true,
			};
		}),

	lock: permissionProcedure("students", "update")
		.input(studentIdSchema)
		.handler(async ({ input }) => {
			const existingStudent = await ensureStudentExists(input.studentId);

			if (existingStudent.status === "inactive") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Sinh viên đã bị khóa",
				});
			}

			const [lockedStudent] = await db
				.update(student)
				.set({
					status: "inactive",
					updatedAt: new Date(),
				})
				.where(eq(student.id, input.studentId))
				.returning();

			return {
				student: lockedStudent,
			};
		}),

	unlock: permissionProcedure("students", "update")
		.input(studentIdSchema)
		.handler(async ({ input }) => {
			const existingStudent = await ensureStudentExists(input.studentId);

			if (existingStudent.status === "active") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Sinh viên đã được mở khóa",
				});
			}

			const [unlockedStudent] = await db
				.update(student)
				.set({
					status: "active",
					updatedAt: new Date(),
				})
				.where(eq(student.id, input.studentId))
				.returning();

			return {
				student: unlockedStudent,
			};
		}),
};
