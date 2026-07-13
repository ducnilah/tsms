import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { course } from "@tsms/db/schema/course";
import { department } from "@tsms/db/schema/department";
import { programCourse } from "@tsms/db/schema/programCourse";
import { ensureDepartmentExists } from "./departments";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { permissionProcedure } from "../index";
import { permission } from "process";

const createCourseSchema = z.object({
    code: z.string().min(2, "Vui lòng nhập mã môn học tối thiểu 2 ký tự"),
    name: z.string().min(3, "Vui lòng nhập tên môn học tối thiểu 3 ký tự"),
    credits: z.number().int().positive("Vui lòng nhập số tín chỉ hợp lệ"),
    lectureSessions: z.number().int().nonnegative("Vui lòng nhập số buổi lý thuyết hợp lệ"),
    labSessions: z.number().int().nonnegative("Vui lòng nhập số buổi thực hành hợp lệ"),
    practiceSessions: z.number().int().nonnegative("Vui lòng nhập số buổi thực hành hợp lệ"),
    departmentId: z.number().int().positive("Vui lòng chọn bộ môn cho môn học"),
    description: z.string().optional(),
})

const updateCourseSchema = createCourseSchema.extend({
    courseId: z.number(),
    status: z.enum(["active", "inactive"]),
})

const courseIdSchema = z.object({
    courseId: z.number(),
})

async function ensureCourseCodeUnique(code: string) {
    const [existingCourse] = await db
        .select()
        .from(course)
        .where(eq(course.code, code));

    if (existingCourse) {
        throw new ORPCError("CONFLICT", {
            message: "Mã môn học đã tồn tại",
        });
    }
}

export const courseRouter = {
    list: permissionProcedure("courses", "read").handler(async () => {
        const courses = await db.select().from(course);
        return {
            courses,
        }
    }),

    listByDepartmentFaculty: permissionProcedure("courses", "read")
        .input(z.object({
            departmentId: z.number().optional(),
            facultyId: z.number().optional(),
        }))
        .handler(async ({ input }) => {
            const conditions = [
                input.departmentId ? eq(course.departmentId, input.departmentId) : undefined,
                input.facultyId ? eq(department.facultyId, input.facultyId) : undefined,
            ].filter(Boolean);

            const courses = await db.select().from(course)
            .innerJoin(department, eq(course.departmentId, department.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined);

            return {
                courses,
            };
        }),

    

    create: permissionProcedure("courses", "create")
        .input(createCourseSchema)
        .handler(async ({ input }) => {
            await ensureDepartmentExists(input.departmentId);
            await ensureCourseCodeUnique(input.code);

            const newCourse = await db.insert(course).values({
                code: input.code,
                name: input.name,
                departmentId: input.departmentId,
                description: input.description,
                credits: input.credits,
                lectureSessions: input.lectureSessions,
                labSessions: input.labSessions,
                practiceSessions: input.practiceSessions,
            });
            return {
                course: newCourse,
            };
        }),

    update: permissionProcedure("courses", "update")
        .input(updateCourseSchema)
        .handler(async ({ input }) => {
            await ensureDepartmentExists(input.departmentId);
            const [existingCourse] = await db.select().from(course).where(eq(course.id, input.courseId));
            if (!existingCourse) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Môn học không tồn tại",
                });
            }

            const updatedCourse = await db.update(course)
                .set({
                    code: input.code,
                    name: input.name,
                    departmentId: input.departmentId,
                    description: input.description,
                    credits: input.credits,
                    lectureSessions: input.lectureSessions,
                    labSessions: input.labSessions,
                    practiceSessions: input.practiceSessions,
                    status: input.status,
                })
                .where(eq(course.id, input.courseId));
            return {
                course: updatedCourse,
            };
        }),

    delete: permissionProcedure("courses", "delete")
        .input(courseIdSchema)
        .handler(async ({ input }) => {
            const [existingCourse] = await db.select().from(course).where(eq(course.id, input.courseId));
            if(!existingCourse) {
                throw new ORPCError("NOT_FOUND", {
                    message: "Môn học không tồn tại",
                });
            }

            const [existingProgram] = await db.select().from(programCourse).where(eq(programCourse.courseId, input.courseId));
            if(existingProgram) {
                throw new ORPCError("CONFLICT", {
                    message: "Môn học đang được sử dụng trong chương trình đào tạo, không thể xóa",
                });
            }
            await db.delete(course).where(eq(course.id, input.courseId));

            return {
                message: "Xóa môn học thành công",
            };
        })
    }

