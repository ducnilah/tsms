import { db } from "@tsms/db";
import { permission, rolePermission, userRole, role } from "@tsms/db/schema/index";
import { eq } from "drizzle-orm";

import { ACTION_BITS, type PermissionAction, type PermissionMap } from "../constants/permissions";

export class AuthorizationService {
    async getUserPermissions(userId: number): Promise<PermissionMap> {
        const rows = await db
            .select({
                permissionKey: permission.key,
                value: rolePermission.value,
            })
            .from(userRole)
            .innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
            .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
            .where(eq(userRole.userId, userId));

        const permissionMap: PermissionMap = {};

        for(const row of rows) {
            permissionMap[row.permissionKey] = (permissionMap[row.permissionKey] ?? 0) | row.value;
        }
 
        return permissionMap;
    }

    async hasPermission(userId: number, permissionKey: string, action: PermissionAction): Promise<boolean> {
        const permissionMap = await this.getUserPermissions(userId);
        const currentValue = permissionMap[permissionKey] ?? 0;
        const requiredValue = ACTION_BITS[action];

        return (currentValue & requiredValue) === requiredValue;
    }

    async getPermissionCatalog() {
        return await db.select({
            id: permission.id,
            key: permission.key,
            name: permission.name,
            bitValue: permission.bitValue,
        }).from(permission);
    }

    async getRolePermissionMatrix(roleId: number) {
        const [roleData] = await db
            .select()
            .from(role)
            .where(eq(role.id, roleId));

        if(!roleData) {
            throw new Error("ROLE_NOT_FOUND")
        }

        const catalog = await this.getPermissionCatalog();

        const assignedRows = await db
            .select({
                permissionKey: permission.key,
                value: rolePermission.value,
            })
            .from(rolePermission)
            .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
            .where(eq(rolePermission.roleId, roleId));

        const assignedMap = new Map(
            assignedRows.map(row => [row.permissionKey, row.value]),
        );

        return {
            role: roleData,
            permissions: catalog.map((item) => ({
                id: item.id,
                key: item.key,
                name: item.name,
                assignedValue: assignedMap.get(item.key) ?? 0,
                maxValue: item.bitValue,
            }))
        }
    }

    async updateRolePermissions(roleId: number, permissionsInput: Array<{permissionKey: string; value: number}>) {
		const authorizationService = new AuthorizationService();
		const [roleData] = await db
			.select()
			.from(role)
			.where(eq(role.id, roleId));

		if (!roleData) {
			throw new Error("ROLE_NOT_FOUND");
		}


		const catalog = await authorizationService.getPermissionCatalog();

		const catalogMap = new Map(
			catalog.map((item) => [item.key, item]),
		);

		for (const item of permissionsInput) {
			const catalogPermission = catalogMap.get(item.permissionKey);

			if (!catalogPermission) {
				throw new Error(`INVALID_PERMISSION_KEY:${item.permissionKey}`);
			}

			if ((item.value & catalogPermission.bitValue) !== item.value) {
				throw new Error(`INVALID_PERMISSION_VALUE:${item.permissionKey}`);
			}
		}

		await db
			.delete(rolePermission)
			.where(eq(rolePermission.roleId, roleId));

		const rowsToInsert = permissionsInput
			.filter((item) => item.value > 0)
			.map((item) => {
				const catalogPermission = catalogMap.get(item.permissionKey)!;

				return {
					roleId,
					permissionId: catalogPermission.id,
					value: item.value,
				};
			});

		if (rowsToInsert.length > 0) {
			await db.insert(rolePermission).values(rowsToInsert);
		}
    }
}
