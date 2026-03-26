describe("Logger (dev mode, level=trace)", () => {
  let logger, stdoutSpy, stderrSpy;
  let savedAppName, savedVersion;

  beforeAll(() => {
    // Save and clear env to ensure fallback branches are covered
    savedAppName = process.env.APP_NAME;
    savedVersion = process.env.npm_package_version;
    delete process.env.APP_NAME;
    delete process.env.npm_package_version;
    process.env.LOG_LEVEL = "trace";
    delete process.env.NODE_ENV;
    jest.isolateModules(() => {
      logger = require("../src/logger");
    });
  });

  afterAll(() => {
    delete process.env.LOG_LEVEL;
    if (savedAppName !== undefined) process.env.APP_NAME = savedAppName;
    if (savedVersion !== undefined) process.env.npm_package_version = savedVersion;
  });

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("should expose the current log level", () => {
    expect(logger.level).toBe("trace");
  });

  it("trace writes to stdout", () => {
    logger.trace("trace msg");
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0][0]).toContain("trace msg");
  });

  it("debug writes to stdout", () => {
    logger.debug("debug msg");
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });

  it("info writes to stdout with meta", () => {
    logger.info("info msg", { key: "val" });
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0][0]).toContain("info msg");
  });

  it("info with no meta omits meta string", () => {
    logger.info("bare msg");
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });

  it("warn writes to stdout", () => {
    logger.warn("warn msg");
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });

  it("error writes to stderr", () => {
    logger.error("error msg", { code: 500 });
    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy.mock.calls[0][0]).toContain("error msg");
  });

  it("fatal writes to stderr", () => {
    logger.fatal("fatal msg");
    expect(stderrSpy).toHaveBeenCalledTimes(1);
  });

  describe("child logger", () => {
    it("includes parent context", () => {
      const child = logger.child({ requestId: "abc" });
      child.info("child msg");
      expect(stdoutSpy).toHaveBeenCalledTimes(1);
      expect(stdoutSpy.mock.calls[0][0]).toContain("child msg");
    });

    it("supports all levels", () => {
      const child = logger.child({ mod: "x" });
      child.trace("t");
      child.debug("d");
      child.info("i");
      child.warn("w");
      expect(stdoutSpy).toHaveBeenCalledTimes(4);
      child.error("e");
      child.fatal("f");
      expect(stderrSpy).toHaveBeenCalledTimes(2);
    });

    it("supports nested children", () => {
      const grandchild = logger.child({ a: 1 }).child({ b: 2 });
      grandchild.info("nested");
      expect(stdoutSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe("Logger (dev mode, level=info — filtering)", () => {
  let logger, stdoutSpy, stderrSpy;

  beforeAll(() => {
    process.env.LOG_LEVEL = "info";
    delete process.env.NODE_ENV;
    jest.isolateModules(() => {
      logger = require("../src/logger");
    });
  });

  afterAll(() => {
    delete process.env.LOG_LEVEL;
  });

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("filters out trace and debug", () => {
    logger.trace("filtered");
    logger.debug("filtered");
    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("child also filters trace and debug", () => {
    const child = logger.child({ c: 1 });
    child.trace("filtered");
    child.debug("filtered");
    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});

describe("Logger (production mode)", () => {
  let prodLogger, stdoutSpy;

  beforeAll(() => {
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "trace";
    jest.isolateModules(() => {
      prodLogger = require("../src/logger");
    });
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
  });

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("outputs valid JSON with required fields", () => {
    prodLogger.info("prod msg", { userId: 42 });
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(parsed.message).toBe("prod msg");
    expect(parsed.level).toBe("info");
    expect(parsed.userId).toBe(42);
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.service).toBeDefined();
    expect(parsed.version).toBeDefined();
  });

  it("outputs JSON for all levels via stdout", () => {
    prodLogger.trace("t");
    prodLogger.debug("d");
    prodLogger.info("i");
    prodLogger.warn("w");
    prodLogger.error("e");
    prodLogger.fatal("f");
    expect(stdoutSpy).toHaveBeenCalledTimes(6);
    // All should be valid JSON
    for (const call of stdoutSpy.mock.calls) {
      const parsed = JSON.parse(call[0]);
      expect(parsed.timestamp).toBeDefined();
    }
  });

  it("handles circular references safely", () => {
    const obj = { name: "test" };
    obj.self = obj;
    prodLogger.info("circular", obj);
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const output = stdoutSpy.mock.calls[0][0];
    expect(output).toContain("serializationError");
  });

  it("child outputs JSON with context", () => {
    const child = prodLogger.child({ reqId: "xyz" });
    child.info("child prod");
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(parsed.reqId).toBe("xyz");
    expect(parsed.message).toBe("child prod");
  });
});

describe("Logger (invalid LOG_LEVEL)", () => {
  let logger;

  beforeAll(() => {
    process.env.LOG_LEVEL = "INVALID_LEVEL";
    delete process.env.NODE_ENV;
    jest.isolateModules(() => {
      logger = require("../src/logger");
    });
  });

  afterAll(() => {
    delete process.env.LOG_LEVEL;
  });

  it("falls back to info level", () => {
    const stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    logger.debug("should not appear");
    expect(stdoutSpy).not.toHaveBeenCalled();
    logger.info("should appear");
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    stdoutSpy.mockRestore();
  });
});

describe("Logger (custom APP_NAME and npm_package_version)", () => {
  let logger, stdoutSpy;

  beforeAll(() => {
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "info";
    process.env.APP_NAME = "custom-service";
    process.env.npm_package_version = "2.5.0";
    jest.isolateModules(() => {
      logger = require("../src/logger");
    });
  });

  afterAll(() => {
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    delete process.env.APP_NAME;
    delete process.env.npm_package_version;
  });

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it("uses custom APP_NAME in JSON output", () => {
    logger.info("custom svc");
    const parsed = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(parsed.service).toBe("custom-service");
    expect(parsed.version).toBe("2.5.0");
  });
});
