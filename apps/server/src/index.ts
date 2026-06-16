import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@tsms/api/context";
import { appRouter } from "@tsms/api/routers/index";
import { env } from "@tsms/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

// CORS ở đây quyết định browser có được phép gửi/nhận cookie cross-origin hay không.
// Vì frontend và backend đang chạy khác port, browser xem đó là khác origin.
app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Một số request như server-to-server hoặc tool nội bộ có thể không có Origin header.
      // Khi đó mình fallback về origin cấu hình sẵn.
      if (!origin) {
        return env.CORS_ORIGIN;
      }

      // Cho phép local development từ localhost / 127.0.0.1 với mọi port.
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return origin;
      }

      // Với các origin khác, chỉ cho phép origin đã cấu hình rõ ràng.
      return env.CORS_ORIGIN;
    },

    // Đây là line bắt buộc nếu muốn browser gửi cookie cross-origin.
    credentials: true,

    allowMethods: ["GET", "POST", "OPTIONS"],

    // Không cần Authorization nữa vì access token không đi qua header.
    allowHeaders: ["Content-Type"],
  }),
);

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  // Mỗi request vào đây sẽ được dựng app context một lần.
  // Từ bước 2 trở đi, createContext sẽ đọc access token từ cookie.
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.use(logger());

app.get("/", (c) => {
  return c.text("OK");
});

import { serve } from "@hono/node-server";

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);