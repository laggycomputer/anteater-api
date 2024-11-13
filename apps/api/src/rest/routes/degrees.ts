import { defaultHook } from "$hooks";
import { productionCache } from "$middleware";
import { errorSchema, responseSchema } from "$schema";
import { DegreeService } from "$services";
import type { Bindings } from "$types/bindings";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { database } from "@packages/db";
import { z } from "zod";

const createDegreeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  division: z.enum(["Undergraduate", "Graduate"], "Division must be Undergraduate or Graduate"),
  description: z.string().optional(),
});

const updateDegreeSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  division: z.enum(["Undergraduate", "Graduate"]).optional(),
  description: z.string().optional(),
});

const degreeQuerySchema = z.object({
  name: z.string().optional(),
  division: z.enum(["Undergraduate", "Graduate"]).optional(),
});

const degreesRouter = new OpenAPIHono<{ Bindings: Bindings }>({ defaultHook });

const createDegreeRoute = createRoute({
  summary: "Create a new degree",
  operationId: "createDegree",
  tags: ["Degrees"],
  method: "post",
  path: "/",
  request: { body: createDegreeSchema },
  description: "Creates a new degree record.",
  responses: {
    201: {
      content: {
        "application/json": {
          schema: responseSchema(
            z.object({
              id: z.string(),
              name: z.string(),
              division: z.string(),
              description: z.string().optional(),
            }),
          ),
        },
      },
      description: "Degree created successfully.",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Validation errors.",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Degree with the given name already exists.",
    },
    500: {
      content: { "application/json": { schema: errorSchema } },
      description: "Internal server error.",
    },
  },
});

const getAllDegreesRoute = createRoute({
  summary: "Get all degrees",
  operationId: "getAllDegrees",
  tags: ["Degrees"],
  method: "get",
  path: "/",
  request: { query: degreeQuerySchema },
  description: "Retrieves a list of all degrees, optionally filtered by query parameters.",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: responseSchema(
            z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                division: z.string(),
                description: z.string().optional(),
              }),
            ),
          ),
        },
      },
      description: "A list of degrees.",
    },
    500: {
      content: { "application/json": { schema: errorSchema } },
      description: "Internal server error.",
    },
  },
});

const getDegreeByIdRoute = createRoute({
  summary: "Get a degree by ID",
  operationId: "getDegreeById",
  tags: ["Degrees"],
  method: "get",
  path: "/:id",
  request: { params: z.object({ id: z.string() }) },
  description: "Retrieves a degree by its unique ID.",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: responseSchema(
            z.object({
              id: z.string(),
              name: z.string(),
              division: z.string(),
              description: z.string().optional(),
            }),
          ),
        },
      },
      description: "Degree details.",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Degree not found.",
    },
    500: {
      content: { "application/json": { schema: errorSchema } },
      description: "Internal server error.",
    },
  },
});

const updateDegreeRoute = createRoute({
  summary: "Update a degree by ID",
  operationId: "updateDegree",
  tags: ["Degrees"],
  method: "put",
  path: "/:id",
  request: { params: z.object({ id: z.string() }), body: updateDegreeSchema },
  description: "Updates an existing degree record by its ID.",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: responseSchema(
            z.object({
              id: z.string(),
              name: z.string(),
              division: z.string(),
              description: z.string().optional(),
            }),
          ),
        },
      },
      description: "Degree updated successfully.",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Validation errors.",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Degree not found.",
    },
    500: {
      content: { "application/json": { schema: errorSchema } },
      description: "Internal server error.",
    },
  },
});

const deleteDegreeRoute = createRoute({
  summary: "Delete a degree by ID",
  operationId: "deleteDegree",
  tags: ["Degrees"],
  method: "delete",
  path: "/:id",
  request: { params: z.object({ id: z.string() }) },
  description: "Deletes a degree record by its unique ID.",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: responseSchema(z.object({ message: z.string() })),
        },
      },
      description: "Degree deleted successfully.",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Degree not found.",
    },
    500: {
      content: { "application/json": { schema: errorSchema } },
      description: "Internal server error.",
    },
  },
});

degreesRouter.get(
  "*",
  productionCache({ cacheName: "anteater-api-degrees", cacheControl: "max-age=3600" }),
);

const service = new DegreeService(database(process.env.DB.connectionString));

degreesRouter.openapi(createDegreeRoute, async (c) => {
  const body = c.req.valid("body");
  try {
    const newDegree = await service.createDegree(body);
    return c.json({ ok: true, data: newDegree }, 201);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("unique")) {
      return c.json({ ok: false, message: "Degree with this name already exists." }, 409);
    }
    console.error("Error creating degree:", error);
    return c.json({ ok: false, message: "Internal server error." }, 500);
  }
});

degreesRouter.openapi(getAllDegreesRoute, async (c) => {
  const query = c.req.valid("query");
  try {
    const degrees = await service.getDegrees(query);
    return c.json({ ok: true, data: degrees }, 200);
  } catch (error: unknown) {
    console.error("Error fetching all degrees:", error);
    return c.json({ ok: false, message: "Internal server error." }, 500);
  }
});

degreesRouter.openapi(getDegreeByIdRoute, async (c) => {
  const { id } = c.req.valid("params");
  try {
    const degree = await service.getDegreeById(id);
    if (!degree) {
      return c.json({ ok: false, message: "Degree not found." }, 404);
    }
    return c.json({ ok: true, data: degree }, 200);
  } catch (error: unknown) {
    console.error("Error fetching degree by ID:", error);
    return c.json({ ok: false, message: "Internal server error." }, 500);
  }
});

degreesRouter.openapi(updateDegreeRoute, async (c) => {
  const { id } = c.req.valid("params");
  const body = c.req.valid("body");
  try {
    const updatedDegree = await service.updateDegree(id, body);
    if (!updatedDegree) {
      return c.json({ ok: false, message: "Degree not found." }, 404);
    }
    return c.json({ ok: true, data: updatedDegree }, 200);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("unique")) {
      return c.json({ ok: false, message: "Degree with this name already exists." }, 409);
    }
    console.error("Error updating degree:", error);
    return c.json({ ok: false, message: "Internal server error." }, 500);
  }
});

degreesRouter.openapi(deleteDegreeRoute, async (c) => {
  const { id } = c.req.valid("params");
  try {
    const deleted = await service.deleteDegree(id);
    if (!deleted) {
      return c.json({ ok: false, message: "Degree not found." }, 404);
    }
    return c.json({ ok: true, message: "Degree deleted successfully." }, 200);
  } catch (error: unknown) {
    console.error("Error deleting degree:", error);
    return c.json({ ok: false, message: "Internal server error." }, 500);
  }
});

export { degreesRouter };
