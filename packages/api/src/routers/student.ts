import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { faculty } from "@tsms/db/schema/faculty";
import { major } from "@tsms/db/schema/major";
import { program } from "@tsms/db/schema/program";
import { student } from "@tsms/db/schema/student";
import { studentClass } from "@tsms/db/schema/studentClass";
import { and, eq, ne, or } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

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
	list: permissionProcedure("students", "read").handler(async () => {
		const [students, studentClasses, programs, majors, faculties] = await Promise.all([
			db.select().from(student),
			db.select().from(studentClass),
			db.select().from(program),
			db.select().from(major),
			db.select().from(faculty),
		]);

		return {
			students: students.map((item) => {
				const classItem =
					studentClasses.find((studentClassRow) => studentClassRow.id === item.classId) ??
					null;
				const programItem =
					programs.find((programRow) => programRow.id === item.programId) ?? null;
				const majorItem =
					majors.find((majorRow) => majorRow.id === programItem?.majorId) ?? null;
				const facultyItem =
					faculties.find((facultyRow) => facultyRow.id === classItem?.facultyId) ?? null;

				return {
					...item,
					classCode: classItem?.code ?? "",
					className: classItem?.name ?? "Không xác định",
					programCode: programItem?.code ?? "",
					programName: programItem?.name ?? "Không xác định",
					majorName: majorItem?.name ?? "Không xác định",
					facultyName: facultyItem?.name ?? "Không xác định",
				};
			}),
		};
	}),

	byId: permissionProcedure("students", "read")
		.input(studentIdSchema)
		.handler(async ({ input }) => {
			const existingStudent = await ensureStudentExists(input.studentId);

			const [studentClassItem, programItem, majorItem, facultyItem] = await Promise.all([
				db.select().from(studentClass).where(eq(studentClass.id, existingStudent.classId)),
				db.select().from(program).where(eq(program.id, existingStudent.programId)),
				db.select()
					.from(major)
					.where(eq(major.id, existingStudent.programId)), // Assuming program has a majorId
				db.select()
					.from(faculty)
					.where(eq(faculty.id, existingStudent.classId)), // Assuming class has a facultyId
			]);

			return {
				student: {
					...existingStudent,
					classCode: studentClassItem[0]?.code ?? "Không xác định",
					programName: programItem[0]?.name ?? "Không xác định",
					majorName: majorItem[0]?.name ?? "Không xác định",
					facultyName: facultyItem[0]?.name ?? "Không xác định",
				},
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
};
