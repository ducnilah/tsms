import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { building } from "@tsms/db/schema/building";
import { classroom } from "@tsms/db/schema/classroom";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const createBuildingSchema = z.object({
	code: z.string().trim().min(2, "Vui lòng nhập mã tòa nhà tối thiểu 2 ký tự"),
});

const updateBuildingSchema = createBuildingSchema.extend({
	buildingId: z.number().int().positive("Vui lòng chọn tòa nhà cần cập nhật"),
	status: z.enum(["active", "inactive"]),
});

const buildingIdSchema = z.object({
	buildingId: z.number().int().positive("Vui lòng chọn tòa nhà cần thao tác"),
});

async function ensureBuildingExists(buildingId: number) {
	const [existingBuilding] = await db
		.select()
		.from(building)
		.where(eq(building.id, buildingId));

	if (!existingBuilding) {
		throw new ORPCError("NOT_FOUND", {
			message: "Tòa nhà không tồn tại",
		});
	}

	return existingBuilding;
}

async function ensureBuildingCodeUnique(code: string, buildingId?: number) {
	const conditions = buildingId
		? and(eq(building.code, code), ne(building.id, buildingId))
		: eq(building.code, code);

	const [existingBuilding] = await db.select().from(building).where(conditions);

	if (existingBuilding) {
		throw new ORPCError("CONFLICT", {
			message: "Mã tòa nhà đã tồn tại",
		});
	}
}

export const buildingRouter = {
	list: permissionProcedure("buildings", "read").handler(async () => {
		const [buildings, classrooms] = await Promise.all([
			db.select().from(building),
			db.select().from(classroom),
		]);

		return {
			buildings: buildings.map((item) => ({
				...item,
				classroomCount: classrooms.filter(
					(classroomItem) => classroomItem.buildingId === item.id,
				).length,
			})),
		};
	}),

	options: permissionProcedure("buildings", "read").handler(async () => {
		const buildings = await db.select().from(building);

		return {
			buildings: buildings.map((item) => ({
				id: item.id,
				code: item.code,
				status: item.status,
			})),
		};
	}),

	byId: permissionProcedure("buildings", "read")
		.input(buildingIdSchema)
		.handler(async ({ input }) => {
			const existingBuilding = await ensureBuildingExists(input.buildingId);
			const classroomRows = await db
				.select({ id: classroom.id })
				.from(classroom)
				.where(eq(classroom.buildingId, input.buildingId));

			return {
				building: {
					...existingBuilding,
					classroomCount: classroomRows.length,
				},
			};
		}),

	create: permissionProcedure("buildings", "create")
		.input(createBuildingSchema)
		.handler(async ({ input }) => {
			await ensureBuildingCodeUnique(input.code);

			const [newBuilding] = await db
				.insert(building)
				.values({
					code: input.code,
				})
				.returning();

			return {
				building: newBuilding,
			};
		}),

	update: permissionProcedure("buildings", "update")
		.input(updateBuildingSchema)
		.handler(async ({ input }) => {
			await ensureBuildingExists(input.buildingId);
			await ensureBuildingCodeUnique(input.code, input.buildingId);

			const [updatedBuilding] = await db
				.update(building)
				.set({
					code: input.code,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(building.id, input.buildingId))
				.returning();

			return {
				building: updatedBuilding,
			};
		}),

	delete: permissionProcedure("buildings", "delete")
		.input(buildingIdSchema)
		.handler(async ({ input }) => {
			await ensureBuildingExists(input.buildingId);

			const classroomRows = await db
				.select({ id: classroom.id })
				.from(classroom)
				.where(eq(classroom.buildingId, input.buildingId));

			if (classroomRows.length > 0) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Không thể xóa tòa nhà khi vẫn còn phòng học liên kết",
				});
			}

			await db.delete(building).where(eq(building.id, input.buildingId));

			return {
				success: true,
			};
		}),
};
