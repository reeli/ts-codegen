import { transformServers } from "@ts-tool/ts-codegen-core";

describe("#transformServers", () => {
  it("should pick basePath and host from url and variables", () => {
    expect(
      transformServers([
        {
          url: "https://{username}.gigantic-server.com:{port}/{basePath}",
          variables: {
            username: {
              default: "demo",
              description: "this value is assigned by the service provider, in this example `gigantic-server.com`",
            },
            port: {
              enum: ["8443", "443"],
              default: "8443",
            },
            basePath: {
              default: "api/v2",
            },
          },
        },
      ]),
    ).toEqual("/api/v2");
  });

  it("should pick basePath and host from url", () => {
    expect(transformServers([{ url: "http://petstore.swagger.io/api/v3" }])).toEqual("/api/v3");
  });

  it("should return url if given url is not a valid url", () => {
    expect(transformServers([{ url: "/api/v3" }])).toEqual("/api/v3");
  });
});
