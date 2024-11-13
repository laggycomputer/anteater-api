import type {
  degreeSchema,
  degreesQuerySchema,
  majorSchema,
  minorSchema,
  specializationSchema,
} from "$schema";
import { degree, degreeView, major, minor, specialization } from "@packages/db/schema";
import { orNull } from "@packages/stdlib";
import { type SQL, and, eq, ilike } from "drizzle-orm";
import type { z } from "zod";

type DegreesServiceInput = z.infer<typeof degreesQuerySchema>;
type DegreesServiceOutput = z.infer<typeof degreeSchema>;

type RawDegree = typeof degreeView.$inferSelect;

const transformDegree = ({ ...degree }: RawDegree): DegreesServiceOutput => ({
  ...degree,
});

function buildDegreeQuery(input: DegreesServiceInput): SQL {
  const conditions: Array<SQL | undefined> = [];

  if (input.name) {
    conditions.push(ilike(degreeView.name, `%${input.name}%`));
  }

  if (input.division) {
    conditions.push(eq(degreeView.division, input.division));
  }

  return and(...conditions);
}

export class DegreesService {
  constructor(private readonly db: ReturnType<typeof import("@packages/db").database>) {}

  async getDegrees(input: DegreesServiceInput): Promise<DegreesServiceOutput[]> {
    const query = buildDegreeQuery(input);
    const degrees = await this.db.select().from(degreeView).where(query).execute();
    return degrees.map(transformDegree);
  }

  async getDegreeById(id: string): Promise<DegreesServiceOutput | null> {
    const [degreeRecord] = await this.db
      .select()
      .from(degreeView)
      .where(eq(degreeView.id, id))
      .limit(1)
      .execute();
    return orNull(degreeRecord);
  }

  async createDegree(input: {
    name: string;
    division: string;
    description?: string;
  }): Promise<DegreesServiceOutput> {
    const [newDegree] = await this.db.insert(degree).values(input).returning();
    return transformDegree(newDegree);
  }

  async updateDegree(
    id: string,
    input: {
      name?: string;
      division?: string;
      description?: string;
    },
  ): Promise<DegreesServiceOutput | null> {
    const [updatedDegree] = await this.db
      .update(degree)
      .set({
        ...input,
        updated_at: new Date(),
      })
      .where(eq(degree.id, id))
      .returning();
    return orNull(updatedDegree);
  }

  async deleteDegree(id: string): Promise<boolean> {
    const result = await this.db.delete(degree).where(eq(degree.id, id)).execute();
    return result.length > 0;
  }

  async getMajors(degreeId: string): Promise<z.infer<typeof majorSchema>[]> {
    const majors = await this.db.select().from(major).where(eq(major.degreeId, degreeId)).execute();
    return majors;
  }

  async getMinors(degreeId: string): Promise<z.infer<typeof minorSchema>[]> {
    const minors = await this.db.select().from(minor).where(eq(minor.degreeId, degreeId)).execute();
    return minors;
  }

  async getSpecializations(majorId: string): Promise<z.infer<typeof specializationSchema>[]> {
    const specializations = await this.db
      .select()
      .from(specialization)
      .where(eq(specialization.majorId, majorId))
      .execute();
    return specializations;
  }
}
