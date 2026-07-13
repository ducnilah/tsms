import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { classroom } from "@tsms/db/schema/classroom";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { permissionProcedure } from "../index";

const createClassroomSchema = z.object({
    code: z.string().min(2, "Vui lòng nhập tên phòng học tối thiểu 2 ký tự"),
    buildingId: z.number().int().positive("Vui lòng chọn tòa nhà của phòng học"),
    capacity: z.number().int().positive("Vui lòng nhập sức chứa hợp lệ"),
    type: z.enum(["lecture", "lab", "seminar"]),
})

const updateClassroomSchema = createClassroomSchema.extend({
    classroomId: z.number().int().positive("Vui lòng chọn phòng học cần cập nhật"),
    status: z.enum(["active", "inactive"]),
})

const classroomIdSchema = z.object({
    classroomId: z.number().int().positive("Vui lòng chọn phòng học cần thao tác"),
})

async function ensureClassroomExists(classroomId: number) {
    const [existingClassroom] = await db
        .select()
        .from(classroom)
        .where(eq(classroom.id, classroomId));
    
        if(!existingClassroom) {
            throw new ORPCError("NOT_FOUND", {
                message: "Phòng học không tồn tại",
            })
        }

        return existingClassroom;
}

async function ensureClassroomCodeUnique(name: string, classroomId?: number) {
    const conditions = classroomId 
    ? and(eq(classroom.code, name), ne(classroom.id, classroomId))
    : eq(classroom.code, name);

    const [existingClassroom] = await db
        .select()
        .from(classroom)
        .where(conditions);

    if(existingClassroom) {
        throw new ORPCError("BAD_REQUEST", {
            message: "Tên phòng học đã tồn tại",
        })
    }

    return existingClassroom;
}

export const classroomRouter = {
    list: permissionProcedure("classrooms", "read").handler(async() => {
        const classrooms = await db.select().from(classroom);
        return {
            classrooms: classrooms,
        }
    }),

    listByBuilding: permissionProcedure("classrooms", "read")
        .input(z.object({
            buildingId: z.number().int().positive("Vui lòng chọn tòa nhà"),
        }))
        .handler(async({ input }) => {
            const classrooms = await db.select().from(classroom)
            .where(eq(classroom.buildingId, input.buildingId));
            return {
                classrooms: classrooms,
            }
        }),

    byId: permissionProcedure("classrooms", "read")
        .input(classroomIdSchema)
        .handler(async({ input }) => {
            const existingClassroom = await ensureClassroomExists(input.classroomId);
            return {
                classroom: existingClassroom,
            }
        }),

    create: permissionProcedure("classrooms", "create")
        .input(createClassroomSchema)
        .handler(async({ input }) => {
            await ensureClassroomCodeUnique(input.code);
            const [newClassroom] = await db.insert(classroom).values({
                code: input.code,
                buildingId: input.buildingId,
                capacity: input.capacity,
                type: input.type,
            })
            .returning();
            return {
                classroom: newClassroom,
            };
        }),

    update: permissionProcedure("classrooms", "update")
        .input(updateClassroomSchema)
        .handler(async({ input }) => {
            await ensureClassroomExists(input.classroomId);
            await ensureClassroomCodeUnique(input.code, input.classroomId);

            await db.update(classroom).set({
                code: input.code,
                buildingId: input.buildingId,
                capacity: input.capacity,
                type: input.type,
                status: input.status,
            }).where(eq(classroom.id, input.classroomId)).returning();

            return {
                classroom: await ensureClassroomExists(input.classroomId),
            }
        }),

    delete: permissionProcedure("classrooms", "delete")
        .input(classroomIdSchema)
        .handler(async({ input }) => {
            const existingClassroom = await ensureClassroomExists(input.classroomId);

            await db.delete(classroom).where(eq(classroom.id, input.classroomId)).returning();

            return {
                message: `Phòng học ${existingClassroom.code} đã được xóa thành công`,
                classroom: existingClassroom,
            }
        })
}