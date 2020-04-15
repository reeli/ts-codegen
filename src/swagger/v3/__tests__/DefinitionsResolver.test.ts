import { DefinitionsResolver } from "../DefinitionsResolver";
import swagger from "../../../../examples/swagger.v3.petstore.expanded.json";

describe("DefinitionsResolver", () => {
  it("should generate correct definitions", () => {
    const r = DefinitionsResolver.of((swagger as any).components.schemas);
    r.scan();

    expect(r.resolvedDefinitions).toEqual({
      Error: {
        code: "number",
        message: "string",
      },
      NewPet: {
        name: "string",
        "tag?": "string",
      },
      Pet: {
        _extends: ["INewPet"],
        _others: {
          id: "number",
        },
      },
    });
  });
});
