import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { course } from "@tsms/db/schema/course";
import { department } from "@tsms/db/schema/department";
import { faculty } from "@tsms/db/schema/faculty";
import { lecturer } from "@tsms/db/schema/lecturer";
import { program } from "@tsms/db/schema/program";
import { programCourse } from "@tsms/db/schema/programCourse";
import { building } from "@tsms/db/schema/building";
import { ensureDepartmentExists, ensureFacultyExists, facultyIdSchema } from "./departments";
import { classroom } from "@tsms/db/schema/classroom";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { departmentIdSchema } from "./departments";

import { permissionProcedure } from "../index";
import { create } from "domain";
import { en } from "zod/v4/locales";

const createBuildingSchema = z.object({
    code: z.string().min(2, "Vui lòng nhập mã tòa nhà tối thiểu 2 ký tự"),
})

const updateBuildingSchema = createBuildingSchema.extend({
    buildingId: z.number().int().positive("Vui lòng chọn tòa nhà cần cập nhật"),
    status: z.enum(["active", "inactive"]),
})

const buildingIdSchema = z.object({
    buildingId: z.number().int().positive("Vui lòng chọn tòa nhà cần thao tác"),
})

async function ensureBuildingExists(buildingId: number) {
    const [existingBuilding] = await db
        .select()
        .from(building)
        .where(eq(building.id, buildingId));

    if(!existingBuilding) {
        throw new ORPCError("NOT_FOUND", {
            message: "Tòa nhà không tồn tại",
        })
    }

    return existingBuilding;
}

async function ensureBuildingCodeUnique(code: string, buildingId?: number) {
    const conditions = buildingId 
    ? and(eq(building.code, code), ne(building.id, buildingId))
    : eq(building.code, code);

    const [existingBuilding] = await db
        .select()
        .from(building)
        .where(conditions);

    if(existingBuilding) {
        throw new ORPCError("BAD_REQUEST", {
            message: "Mã tòa nhà đã tồn tại",
        })
    }

}

export const buildingRouter = {
    list: permissionProcedure("buildings", "read").handler(async() => {
        const buildings = await db.select().from(building);
        return {
            buildings: buildings,
        }
    }),

    create: permissionProcedure("buildings", "create")
        .input(createBuildingSchema)
        .handler(async({ input }) => {
            await ensureBuildingCodeUnique(input.code);
            const [newBuilding] = await db.insert(building).values({
                code: input.code,
            }).returning();
            return {
                building: newBuilding,
            }
        }),

    update: permissionProcedure("buildings", "update")
        .input(updateBuildingSchema)
        .handler(async({ input }) => {
            await ensureBuildingExists(input.buildingId);
            await ensureBuildingCodeUnique(input.code, input.buildingId);
            
            await db.update(building).set({
                code: input.code,
                status: input.status,
            }).where(eq(building.id, input.buildingId));

            const [updatedBuilding] = await db.select().from(building).where(eq(building.id, input.buildingId));
            return {
                building: updatedBuilding,
            }
        }),

    delete: permissionProcedure("buildings", "delete")
        .input(buildingIdSchema)
        .handler(async({ input }) => {
            await ensureBuildingExists(input.buildingId);
            await db.delete(building).where(eq(building.id, input.buildingId));
            return {
                message: "Tòa nhà đã được xóa thành công",
            }
        })
}