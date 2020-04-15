import { testJSON, toCapitalCase } from "src/core/utils";

describe("#toCapitalCase", () => {
  it("when word is undefined, should return empty string", () => {
    expect(toCapitalCase()).toEqual("");
  });

  it("should transform word to capital case", () => {
    expect(toCapitalCase("helloWorld")).toEqual("HelloWorld");
  });
});

describe("#testJSON", () => {
  it("when inputs is a valid json string, should parse it and return correct json object", () => {
    expect(testJSON("{}")).toEqual({});
    expect(testJSON('["foo","bar",{"foo":"bar"}]')).toEqual(["foo", "bar", { foo: "bar" }]);
  });
  it("when inputs is not a string, should return nothing", () => {
    expect(testJSON(3)).toEqual(undefined);
    expect(testJSON(true)).toEqual(undefined);
    expect(testJSON({})).toEqual(undefined);
    expect(testJSON([])).toEqual(undefined);
  });
  it("when inputs is an invalid json string, should print error message", () => {
    const mockPrint = jest.fn();
    testJSON("{a: 1}", "some error", mockPrint);
    expect(mockPrint).toHaveBeenCalledWith("some error");
  });
});
