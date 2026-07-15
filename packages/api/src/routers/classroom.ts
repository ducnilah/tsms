import { ORPCError } from "@orpc/server";
import { db } from "@tsms/db";
import { building } from "@tsms/db/schema/building";
import { classroom } from "@tsms/db/schema/classroom";
import { and, count, eq, ne, ilike } from "drizzle-orm";
import { z } from "zod";

import { permissionProcedure } from "../index";

const listClassroomsSchema = z.object({
	page: z.number().int().positive("Vui lòng nhập số trang hợp lệ").default(1),
	limit: z.number().int().positive("Vui lòng nhập số lượng bản ghi hợp lệ").default(6),
	search: z.string().trim().optional(),
	buildingId: z.number().int().positive("Vui lòng chọn tòa nhà").optional(),
	type: z.enum(["lecture", "lab", "seminar"]).optional(),
	status: z.enum(["active", "inactive"]).optional(),
}).optional();

const createClassroomSchema = z.object({
	code: z.string().trim().min(2, "Vui lòng nhập mã phòng học tối thiểu 2 ký tự"),
	buildingId: z.number().int().positive("Vui lòng chọn tòa nhà của phòng học"),
	capacity: z.number().int().positive("Vui lòng nhập sức chứa hợp lệ"),
	type: z.enum(["lecture", "lab", "seminar"]),
});

const updateClassroomSchema = createClassroomSchema.extend({
	classroomId: z.number().int().positive("Vui lòng chọn phòng học cần cập nhật"),
	status: z.enum(["active", "inactive"]),
});

const classroomIdSchema = z.object({
	classroomId: z.number().int().positive("Vui lòng chọn phòng học cần thao tác"),
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

async function ensureClassroomExists(classroomId: number) {
	const [existingClassroom] = await db
		.select()
		.from(classroom)
		.where(eq(classroom.id, classroomId));

	if (!existingClassroom) {
		throw new ORPCError("NOT_FOUND", {
			message: "Phòng học không tồn tại",
		});
	}

	return existingClassroom;
}

async function ensureClassroomCodeUnique(code: string, classroomId?: number) {
	const conditions = classroomId
		? and(eq(classroom.code, code), ne(classroom.id, classroomId))
		: eq(classroom.code, code);

	const [existingClassroom] = await db.select().from(classroom).where(conditions);

	if (existingClassroom) {
		throw new ORPCError("CONFLICT", {
			message: "Mã phòng học đã tồn tại",
		});
	}
}

export const classroomRouter = {
	list: permissionProcedure("classrooms", "read")
		.input(listClassroomsSchema)
		.handler(async({ input }) => {
			const page = input?.page ?? 1;
			const limit = input?.limit ?? 6;
			const offset = (page - 1) * limit;

			const conditions = [
				input?.buildingId ? eq(classroom.buildingId, input?.buildingId) : undefined,
				input?.status ? eq(classroom.status, input?.status) : undefined,
				input?.search
					? ilike(classroom.code, `%${input?.search}%`)
					: undefined,
				input?.type ? eq(classroom.type, input?.type) : undefined,
			].filter(Boolean);

			const where = conditions.length > 0 ? and(...conditions) : undefined;

			const [classroomRows, totalRows] = await Promise.all([
				db
					.select()
					.from(classroom)
					.where(where)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(classroom)
					.where(where),
			]);

			const total = totalRows[0]?.total ?? 0;

			return {
				classrooms: classroomRows,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				}
			};
		}),

	options: permissionProcedure("classrooms", "read")
		.input(
			z
				.object({
					buildingId: z.number().int().positive().optional(),
				})
				.optional(),
		)
		.handler(async ({ input }) => {
			const classroomRows = input?.buildingId
				? await db
						.select()
						.from(classroom)
						.where(eq(classroom.buildingId, input.buildingId))
				: await db.select().from(classroom);

			return {
				classrooms: classroomRows.map((item) => ({
					id: item.id,
					buildingId: item.buildingId,
					code: item.code,
					capacity: item.capacity,
					type: item.type,
					status: item.status,
				})),
			};
		}),

	listByBuilding: permissionProcedure("classrooms", "read")
		.input(
			z.object({
				buildingId: z.number().int().positive("Vui lòng chọn tòa nhà"),
			}),
		)
		.handler(async ({ input }) => {
			await ensureBuildingExists(input.buildingId);

			const classrooms = await db
				.select()
				.from(classroom)
				.where(eq(classroom.buildingId, input.buildingId));

			return {
				classrooms,
			};
		}),

	byId: permissionProcedure("classrooms", "read")
		.input(classroomIdSchema)
		.handler(async ({ input }) => {
			const existingClassroom = await ensureClassroomExists(input.classroomId);
			const [buildingItem] = await db
				.select()
				.from(building)
				.where(eq(building.id, existingClassroom.buildingId));

			return {
				classroom: {
					...existingClassroom,
					buildingCode: buildingItem?.code ?? "",
				},
			};
		}),

	create: permissionProcedure("classrooms", "create")
		.input(createClassroomSchema)
		.handler(async ({ input }) => {
			await ensureBuildingExists(input.buildingId);
			await ensureClassroomCodeUnique(input.code);

			const [newClassroom] = await db
				.insert(classroom)
				.values({
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
		.handler(async ({ input }) => {
			await ensureClassroomExists(input.classroomId);
			await ensureBuildingExists(input.buildingId);
			await ensureClassroomCodeUnique(input.code, input.classroomId);

			const [updatedClassroom] = await db
				.update(classroom)
				.set({
					code: input.code,
					buildingId: input.buildingId,
					capacity: input.capacity,
					type: input.type,
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(classroom.id, input.classroomId))
				.returning();

			return {
				classroom: updatedClassroom,
			};
		}),

	delete: permissionProcedure("classrooms", "delete")
		.input(classroomIdSchema)
		.handler(async ({ input }) => {
			await ensureClassroomExists(input.classroomId);

			await db.delete(classroom).where(eq(classroom.id, input.classroomId));

			return {
				success: true,
			};
		}),

	lock: permissionProcedure("classrooms", "update")
		.input(classroomIdSchema)
		.handler(async ({ input }) => {
			await ensureClassroomExists(input.classroomId);

			const [updatedClassroom] = await db
				.update(classroom)
				.set({
					status: "inactive",
					updatedAt: new Date(),
				})
				.where(eq(classroom.id, input.classroomId))
				.returning();

			return {
				classroom: updatedClassroom,
			};
		}),

	unlock: permissionProcedure("classrooms", "update")
		.input(classroomIdSchema)
		.handler(async ({ input }) => {
			await ensureClassroomExists(input.classroomId);

			const [updatedClassroom] = await db
				.update(classroom)
				.set({
					status: "active",
					updatedAt: new Date(),
				})
				.where(eq(classroom.id, input.classroomId))
				.returning();

			return {
				classroom: updatedClassroom,
			};
		}),
};
