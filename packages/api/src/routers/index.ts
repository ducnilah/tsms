import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { authRouter } from "./auth";
import { departmentsRouter } from "./departments";
import { facultiesRouter } from "./faculties";
import { rolesRouter } from "./roles";
import { todoRouter } from "./todo";
import { usersRouter } from "./users";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	// Auth procedures
	"auth.register": authRouter.register,
	"auth.login": authRouter.login,
	"auth.refresh": authRouter.refresh,
	"auth.logout": authRouter.logout,
	"auth.me": authRouter.me,
	// User management procedures
	"users.list": usersRouter.list,
	"users.create": usersRouter.create,
	"users.lock": usersRouter.lock,
	"users.unlock": usersRouter.unlock,
	"users.resetPassword": usersRouter.resetPassword,
	"users.assignRoles": usersRouter.assignRoles,
	// Todo procedures
	"todo.getAll": todoRouter.getAll,
	"todo.create": todoRouter.create,
	"todo.toggle": todoRouter.toggle,
	"todo.delete": todoRouter.delete,
	// Role management procedures
	"roles.create": rolesRouter.createRole,
	"roles.delete": rolesRouter.deleteRole,
	"roles.list": rolesRouter.list,
	"roles.getPermissionCatalog": rolesRouter.getPermissionCatalog,
	"roles.getRolePermissionMatrix": rolesRouter.getRolePermissionMatrix,
	"roles.updateRolePermissions": rolesRouter.updateRolePermissions,
	"faculties.list": facultiesRouter.list,
	"faculties.create": facultiesRouter.create,
	"faculties.update": facultiesRouter.update,
	"faculties.delete": facultiesRouter.delete,
	"departments.listByFaculty": departmentsRouter.listByFaculty,
	"departments.create": departmentsRouter.create,
	"departments.update": departmentsRouter.update,
	"departments.delete": departmentsRouter.delete,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
