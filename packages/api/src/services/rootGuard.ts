import { db } from "@tsms/db";
import { role, userRole } from "@tsms/db/schema/index";
import { eq, and } from "drizzle-orm";
import { ROOT_ROLE_ID } from "../constants/root";
import { ORPCError } from "@orpc/server";

export class RootGuard {
    async getRootRole() {
        const [rootRole] = await db.select().from(role).where(eq(role.id, ROOT_ROLE_ID));
        if(!rootRole) {
            throw new ORPCError("NOT_FOUND", {
                message: "Vai trò ROOT không tồn tại",
            });
        }
        return rootRole;
    }
    async isRootRoleId(roleId: number) {
        return roleId === ROOT_ROLE_ID;
    }
    async isRootUserId(userId: number) {
        const [isRootUser] = await db.select().from(userRole).where(and(eq(userRole.userId, userId), eq(userRole.roleId, ROOT_ROLE_ID)));
        return !!isRootUser;
    }
    async assertRoleIsNotRoot(roleId: number) {
        if (await this.isRootRoleId(roleId)) {
            throw new ORPCError("FORBIDDEN", {
                message: "Không thể thao tác trên vai trò ROOT",
            });
        }
    }
    async assertUserIsNotRoot(userId: number) {
        if (await this.isRootUserId(userId)) {
            throw new ORPCError("FORBIDDEN", {
                message: "Không thể thao tác trên người dùng ROOT",
            });
        }
    }
    async isRootUserByAssignedRoles(roleIds: number[]) {
        for (const roleId of roleIds) {
            if (await this.isRootRoleId(roleId)) {
                return true;
            }
        }
        return false;
    }
}