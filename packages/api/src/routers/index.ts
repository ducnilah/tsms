import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { authRouter } from "./auth";
import { todoRouter } from "./todo";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  // Auth procedures
  "auth.register": authRouter.register,
  "auth.login": authRouter.login,
  // Todo procedures
  "todo.getAll": todoRouter.getAll,
  "todo.create": todoRouter.create,
  "todo.toggle": todoRouter.toggle,
  "todo.delete": todoRouter.delete,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
