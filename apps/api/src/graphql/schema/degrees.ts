import { gql } from "apollo-server-express";

const degreesSchema = gql`
  """
  Represents a preview of an academic degree.
  """
  type DegreePreview @cacheControl(maxAge: 86400) {
    id: ID!
    name: String!
    division: String!
  }

  """
  Represents an academic degree with detailed information.
  """
  type Degree @cacheControl(maxAge: 86400) {
    id: ID!
    name: String!
    division: String!
    description: String
    majors: [Major!]!
    minors: [Minor!]!
    specializations: [Specialization!]!
    createdAt: String!
    updatedAt: String
  }

  """
  Represents a major within a degree.
  """
  type Major {
    id: ID!
    name: String!
    code: String!
    requirements: JSON
    specializations: [Specialization!]!
  }

  """
  Represents a minor within a degree.
  """
  type Minor {
    id: ID!
    name: String!
    requirements: JSON
  }

  """
  Represents a specialization within a major.
  """
  type Specialization {
    id: ID!
    name: String!
    requirements: JSON
  }

  """
  Input type for querying degrees.
  """
  input DegreesQuery {
    name: String
    division: String
    limit: Int
    offset: Int
    sortBy: DegreeSortField
    sortOrder: SortOrder
  }

  """
  Enum for sorting fields in degrees.
  """
  enum DegreeSortField {
    name
    division
    createdAt
    updatedAt
  }

  """
  Enum for sorting order.
  """
  enum SortOrder {
    asc
    desc
  }

  """
  Represents the response after a delete operation.
  """
  type DeleteResponse {
    message: String!
  }

  """
  Input type for creating a new degree.
  """
  input CreateDegreeInput {
    name: String!
    division: String!
    description: String
  }

  """
  Input type for updating an existing degree.
  """
  input UpdateDegreeInput {
    name: String
    division: String
    description: String
  }

  extend type Query {
    """
    Retrieve a single degree by its ID.
    """
    degree(id: ID!): Degree!

    """
    Retrieve a list of degrees based on query parameters.
    """
    degrees(query: DegreesQuery!): [Degree!]!
  }

  extend type Mutation {
    """
    Create a new degree.
    """
    createDegree(input: CreateDegreeInput!): Degree!

    """
    Update an existing degree by its ID.
    """
    updateDegree(id: ID!, input: UpdateDegreeInput!): Degree!

    """
    Delete a degree by its ID.
    """
    deleteDegree(id: ID!): DeleteResponse!
  }
`;

export default degreesSchema;
