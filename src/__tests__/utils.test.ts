import { toCapitalCase } from "../utils";

describe("#toCapitalCase", () => {
  it("when word is undefined, should return empty string", () => {
    expect(toCapitalCase()).toEqual("");
  });

  it("should transform word to capital case", () => {
    expect(toCapitalCase("helloWorld")).toEqual("HelloWorld");
  });
});
