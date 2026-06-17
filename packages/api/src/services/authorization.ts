import { db } from "@tsms/db";
import { module as appModule } from "@tsms/db/schema/module";
import { permission } from "@tsms/db/schema/permission";
import { rolePermission } from "@tsms/db/schema/rolePermission";
import { userRole } from "@tsms/db/schema/userRole";
import { eq } from "drizzle-orm";

export const PermissionAction = {
    create: 1,
    read: 2,
    update: 4,
    delete: 8,
} as const;

export type PermissionActionKey = keyof typeof PermissionAction;

export type UserPermissionRecord = {
    moduleKey: string;
    moduleName: string;
    actionKey: PermissionActionKey;
    bitValue: number;
    permissionKey: string;
}

export class AuthorizationService {
  async getUserPermissionRecords(userId: number): Promise<UserPermissionRecord[]> {
    const rows = await db
      .select({
        moduleKey: appModule.moduleKey,
        moduleName: appModule.moduleName,
        actionKey: permission.actionKey,
        bitValue: permission.bitValue,
        permissionKey: permission.permissionKey,
      })
      .from(userRole)
      .innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
      .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
      .innerJoin(appModule, eq(permission.moduleId, appModule.id))
      .where(eq(userRole.userId, userId));

    return rows;
  }

  async getPermissionMaskByModule(userId: number): Promise<Record<string, number>> {
    const records = await this.getUserPermissionRecords(userId);
    const result: Record<string, number> = {};

    for (const record of records) {
      const currentMask = result[record.moduleKey] ?? 0;
      result[record.moduleKey] = currentMask | record.bitValue;
    }

    return result;
  }

  async getPermissionKeys(userId: number): Promise<string[]> {
    const records = await this.getUserPermissionRecords(userId);

    return Array.from(new Set(records.map((record) => record.permissionKey)));
  }

  async hasPermission(
    userId: number,
    moduleKey: string,
    action: PermissionActionKey,
  ): Promise<boolean> {
    const permissionMap = await this.getPermissionMaskByModule(userId);
    const mask = permissionMap[moduleKey] ?? 0;
    const requiredBit = PermissionAction[action];

    return (mask & requiredBit) === requiredBit;
  }
}

export const authorizationService = new AuthorizationService();

