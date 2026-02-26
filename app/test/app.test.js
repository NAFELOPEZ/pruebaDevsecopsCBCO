const request = require("supertest");
const { app, startServer } = require("../src/index");

describe("Demo App", () => {
  it("GET /health should return ok", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /health?full=true should return full mode", async () => {
    const res = await request(app).get("/health?full=true");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ok", mode: "full" });
  });

  it("GET / should return message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it("startServer should start on a free port and be closable", (done) => {
    const server = startServer(0);
    server.on("listening", () => {
      server.close(done);
    });
  });
});