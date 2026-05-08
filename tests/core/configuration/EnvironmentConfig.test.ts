import { preprodConfig } from "../../../src/core/configuration/PreprodConfig";
import { prodConfig } from "../../../src/core/configuration/ProdConfig";

describe("environment config domain defaults", () => {
  const originalJwtAudience = process.env.JWT_AUDIENCE;
  const originalPublicHost = process.env.PUBLIC_HOST;

  afterEach(() => {
    process.env.JWT_AUDIENCE = originalJwtAudience;
    process.env.PUBLIC_HOST = originalPublicHost;
  });

  it("uses PUBLIC_HOST for production jwt audience when JWT_AUDIENCE is absent", () => {
    delete process.env.JWT_AUDIENCE;
    process.env.PUBLIC_HOST = "geoconflict.ru";

    expect(prodConfig.jwtAudience()).toBe("geoconflict.ru");
  });

  it("does not fall back to upstream OpenFront hosts", () => {
    delete process.env.JWT_AUDIENCE;
    delete process.env.PUBLIC_HOST;

    expect(prodConfig.jwtAudience()).toBe("");
    expect(preprodConfig.jwtAudience()).toBe("");
  });
});
