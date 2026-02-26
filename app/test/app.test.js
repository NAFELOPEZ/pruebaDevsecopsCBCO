const request = require("supertest");
const { app, startServer } = require("../src/index");

describe("Demo App", () => {
  it("GET /health should return ok", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET / should return message", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBeDefined();
  });

it("startServer should start on a free port and be closable", (done) => {
  const server = startServer(0); // 0 => puerto aleatorio libre
  server.on("listening", () => {
    server.close(done);
  });
});
});