import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { authRouter } from "./auth";
import { todoRouter } from "./todo";
import { rolesRouter, usersRouter } from "./users";

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
	"roles.list": rolesRouter.list,
	// Todo procedures
	"todo.getAll": todoRouter.getAll,
	"todo.create": todoRouter.create,
	"todo.toggle": todoRouter.toggle,
	"todo.delete": todoRouter.delete,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
