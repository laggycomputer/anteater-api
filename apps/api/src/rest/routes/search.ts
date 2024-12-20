import { defaultHook } from "$hooks";
import { productionCache } from "$middleware";
import { accessController } from "$middleware";
import { errorSchema, responseSchema, searchQuerySchema, searchResponseSchema } from "$schema";
import { CoursesService, InstructorsService, SearchService } from "$services";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { database } from "@packages/db";

const searchRouter = new OpenAPIHono<{ Bindings: Env }>({ defaultHook });

const searchRoute = createRoute({
  summary: "Retrieve search results",
  operationId: "search",
  tags: ["Other"],
  method: "get",
  path: "/",
  request: { query: searchQuerySchema },
  description: "Retrieves course/instructor results for the given search query.",
  responses: {
    200: {
      content: { "application/json": { schema: responseSchema(searchResponseSchema) } },
      description: "Successful operation",
    },
    422: {
      content: { "application/json": { schema: errorSchema } },
      description: "Parameters failed validation",
    },
    500: {
      content: { "application/json": { schema: errorSchema } },
      description: "Server error occurred",
    },
  },
});

searchRouter.use("*", accessController("FUZZY_SEARCH"));
searchRouter.get(
  "*",
  productionCache({ cacheName: "anteater-api", cacheControl: "max-age=86400" }),
);

searchRouter.openapi(searchRoute, async (c) => {
  const query = c.req.valid("query");
  const db = database(c.env.DB.connectionString);
  const service = new SearchService(db, new CoursesService(db), new InstructorsService(db));
  return c.json({ ok: true, data: searchResponseSchema.parse(await service.doSearch(query)) }, 200);
});

export { searchRouter };
