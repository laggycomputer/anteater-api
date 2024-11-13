import type { GraphQLContext } from "$graphql/graphql-context";
import { createDegreeSchema, degreesQuerySchema, updateDegreeSchema } from "$schema";
import type { Degree, Major, Minor, Specialization } from "$types/degree";
import { BadUserInputError, ConflictError, NotFoundError } from "$utils/errors";
import { isDatabaseError } from "$utils/isDatabaseError";
import { AuthenticationError, ForbiddenError, GraphQLError } from "apollo-server-express";

export const degreesResolvers = {
  Query: {
    degree: async (
      _: unknown,
      { id }: { id: string },
      { degreeService }: GraphQLContext,
    ): Promise<Degree> => {
      try {
        const res = await degreeService.getDegreeById(id);
        if (!res) {
          throw new NotFoundError(`Degree '${id}' not found`);
        }
        return res;
      } catch (error: unknown) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError("Failed to fetch degree.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    degrees: async (
      _: unknown,
      args: { query: unknown },
      { degreeService }: GraphQLContext,
    ): Promise<{ degrees: Degree[]; totalCount: number }> => {
      try {
        const parsedQuery = degreesQuerySchema.parse(args.query);
        const [degrees, totalCount] = await Promise.all([
          degreeService.getDegrees(parsedQuery),
          degreeService.getDegreesCount(parsedQuery),
        ]);
        return { degrees, totalCount };
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw new BadUserInputError(error.message || "Invalid query parameters");
        }
        throw new GraphQLError("An unexpected error occurred.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
  Mutation: {
    createDegree: async (
      _: unknown,
      { input }: { input: unknown },
      { degreeService, user }: GraphQLContext,
    ): Promise<Degree> => {
      if (!user) {
        throw new AuthenticationError("You must be logged in to perform this action.");
      }
      if (!user.roles.includes("ADMIN")) {
        throw new ForbiddenError("You do not have permission to perform this action.");
      }

      try {
        const parsedInput = createDegreeSchema.parse(input);
        const newDegree = await degreeService.createDegree(parsedInput);
        return newDegree;
      } catch (error: unknown) {
        if (isDatabaseError(error)) {
          if (error.code === "23505") {
            throw new ConflictError("Degree with this name already exists.");
          }
        }

        if (error instanceof GraphQLError) {
          throw error;
        }

        if (error instanceof Error) {
          throw new GraphQLError(error.message || "Failed to create degree.", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }

        throw new GraphQLError("An unexpected error occurred while creating the degree.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    updateDegree: async (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      { degreeService, user }: GraphQLContext,
    ): Promise<Degree> => {
      if (!user) {
        throw new AuthenticationError("You must be logged in to perform this action.");
      }
      if (!user.roles.includes("ADMIN")) {
        throw new ForbiddenError("You do not have permission to perform this action.");
      }

      try {
        const parsedInput = updateDegreeSchema.parse(input);
        const updatedDegree = await degreeService.updateDegree(id, parsedInput);
        if (!updatedDegree) {
          throw new NotFoundError(`Degree '${id}' not found.`);
        }
        return updatedDegree;
      } catch (error: unknown) {
        if (isDatabaseError(error)) {
          if (error.code === "23505") {
            throw new ConflictError("Degree with this name already exists.");
          }
        }

        if (error instanceof GraphQLError) {
          throw error;
        }

        if (error instanceof Error) {
          throw new GraphQLError(error.message || "Failed to update degree.", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }

        throw new GraphQLError("An unexpected error occurred while updating the degree.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    deleteDegree: async (
      _: unknown,
      { id }: { id: string },
      { degreeService, user }: GraphQLContext,
    ): Promise<{ message: string }> => {
      if (!user) {
        throw new AuthenticationError("You must be logged in to perform this action.");
      }
      if (!user.roles.includes("ADMIN")) {
        throw new ForbiddenError("You do not have permission to perform this action.");
      }

      try {
        const deleted = await degreeService.deleteDegree(id);
        if (!deleted) {
          throw new NotFoundError(`Degree '${id}' not found.`);
        }
        return { message: "Degree deleted successfully." };
      } catch (error: unknown) {
        if (error instanceof GraphQLError) {
          throw error;
        }

        if (error instanceof Error) {
          throw new GraphQLError(error.message || "Failed to delete degree.", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          });
        }

        throw new GraphQLError("An unexpected error occurred while deleting the degree.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
  },
  Degree: {
    majors: async (
      parent: Degree,
      _: unknown,
      { majorLoader }: GraphQLContext,
    ): Promise<Major[]> => {
      try {
        return await majorLoader.load(parent.id);
      } catch (error: unknown) {
        throw new GraphQLError(error instanceof Error ? error.message : "Failed to fetch majors.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    minors: async (
      parent: Degree,
      _: unknown,
      { degreeService }: GraphQLContext,
    ): Promise<Minor[]> => {
      try {
        return await degreeService.getMinors(parent.id);
      } catch (error: unknown) {
        throw new GraphQLError(error instanceof Error ? error.message : "Failed to fetch minors.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    },
    specializations: async (
      parent: Degree,
      _: unknown,
      { specializationLoader }: GraphQLContext,
    ): Promise<Specialization[]> => {
      try {
        return await specializationLoader.load(parent.id);
      } catch (error: unknown) {
        throw new GraphQLError(
          error instanceof Error ? error.message : "Failed to fetch specializations.",
          {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          },
        );
      }
    },
  },
};
