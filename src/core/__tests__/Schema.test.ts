import { Schema } from "src/core/Schema";

describe("Schema Converter", () => {
  describe("oneOf", () => {
    it("should handle refs in oneOf", () => {
      const res = new Schema()
        .convert(
          {
            oneOf: [
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                $ref: "#/components/schemas/Dog",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("Cat|Dog");
    });

    it("should handle basic type in oneOf", () => {
      const res = new Schema()
        .convert(
          {
            oneOf: [
              {
                type: "string",
              },
              {
                type: "boolean",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("string|boolean");
    });

    it("should handle both refs and basic type in oneOf", () => {
      const res = new Schema()
        .convert(
          {
            oneOf: [
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                type: "integer",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("Cat|number");
    });
  });

  describe("anyOf", () => {
    it("should handle refs in anyOf", () => {
      const res = new Schema()
        .convert(
          {
            anyOf: [
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                $ref: "#/components/schemas/Dog",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("Cat|Dog");
    });

    it("should handle basic type in anyOf", () => {
      const res = new Schema()
        .convert(
          {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "boolean",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("string|boolean");
    });

    it("should handle both refs and basic type in anyOf", () => {
      const res = new Schema()
        .convert(
          {
            anyOf: [
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                type: "integer",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("Cat|number");
    });
  });

  describe("array", () => {
    it("should handle array of enum", () => {
      const res = new Schema()
        .convert(
          {
            type: "array",
            example: ["ZERO"],
            items: {
              type: "string",
              enum: ["ZERO", "ONE", "TWO", "THREE", "MORE_THAN_THREE", "FOUR", "FIVE", "FIVE_OR_MORE"],
            },
          },
          "visitsCount",
        )
        .toType();

      expect(res).toEqual("keyof typeof VisitsCount[]");
    });

    it("should handle array of string", () => {
      const res = new Schema()
        .convert(
          {
            type: "array",
            items: {
              type: "string",
            },
          },
          "status",
        )
        .toType();

      expect(res).toEqual("string[]");
    });

    it("should handle array of nested array", () => {
      const res = new Schema()
        .convert(
          {
            type: "array",
            items: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Cat",
              },
            },
          },
          "status",
        )
        .toType();

      expect(res).toEqual("Cat[][]");
    });

    it("should handle array of ref", () => {
      const res = new Schema()
        .convert(
          {
            type: "array",
            items: {
              $ref: "#/components/schemas/Pet",
            },
          },
          "status",
        )
        .toType();

      expect(res).toEqual("Pet[]");
    });

    it("should handle tuple type", () => {
      const res = new Schema()
        .convert(
          {
            type: "array",
            items: [
              {
                $ref: "#/components/schemas/Pet",
              },
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                type: "string",
              },
            ],
          },
          "status",
        )
        .toType();

      expect(res).toEqual("[Pet,Cat,string]");
    });
  });

  describe("ref", () => {
    it("should handle ref", () => {
      const res = new Schema()
        .convert(
          {
            $ref: "#/components/schemas/Pet",
          },
          "visitsCount",
        )
        .toType();

      expect(res).toEqual("Pet");
    });
  });

  describe("enum", () => {
    it("should handle enum", () => {
      const res = new Schema()
        .convert(
          {
            type: "string",
            enum: ["AAA", "BBB"],
          },
          "status",
        )
        .toType();

      expect(res).toEqual("keyof typeof Status");
    });
  });

  describe("string", () => {
    it("should handle string", () => {
      const res = new Schema()
        .convert(
          {
            type: "string",
          },
          "status",
        )
        .toType();

      expect(res).toEqual("string");
    });
  });

  describe("boolean", () => {
    it("should handle boolean", () => {
      const res = new Schema()
        .convert(
          {
            type: "boolean",
          },
          "status",
        )
        .toType();

      expect(res).toEqual("boolean");
    });
  });

  describe("number", () => {
    it("should handle integer", () => {
      const res = new Schema()
        .convert(
          {
            type: "integer",
          },
          "status",
        )
        .toType();

      expect(res).toEqual("number");
    });

    it("should handle number", () => {
      const res = new Schema()
        .convert(
          {
            type: "number",
          },
          "status",
        )
        .toType();

      expect(res).toEqual("number");
    });
  });

  describe("file", () => {
    it("should handle file", () => {
      const res = new Schema()
        .convert(
          {
            type: "file",
          },
          "status",
        )
        .toType();

      expect(res).toEqual("File");
    });
  });
});
