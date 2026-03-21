/**
 * index.js — Entrada principal de la aplicación Express
 *
 * Endpoints disponibles:
 *   GET /                 → { message: "Hello from DevSecOps technical test to CBCO!!!!!!" }
 *   GET /health           → { status: "ok" }
 *   GET /health?full=true → { status: "ok", mode: "full" }
 */

"use strict";

const express = require("express");
const logger  = require("./logger");

const app  = express();
const port = process.env.PORT || 3000;

// ── Middleware: logging de requests HTTP ──────────────────────
// Registra cada request en formato JSON estructurado.
// Compatible con Fluent Bit (parser: json), Loki y CloudWatch.
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    logger.info("http_request", {
      method:      req.method,
      path:        req.path,
      status:      res.statusCode,
      duration_ms: Date.now() - startTime,
      user_agent:  req.get("User-Agent") || "-",
    });
  });

  next();
});

// ── Rutas ─────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ message: "Hello from DevSecOps technical test to CBCO!!!!!!" });
});

app.get("/health", (req, res) => {
  const full = req.query.full === "true";

  if (full) {
    return res.status(200).json({ status: "ok", mode: "full" });
  }

  return res.status(200).json({ status: "ok" });
});

// ── Servidor ──────────────────────────────────────────────────

// Fix coverage test - función exportable y testeable
function startServer(customPort = port) {
  return app.listen(customPort, () => {
    logger.info("server_started", { port: customPort });
  });
}

// Fix coverage test - si se ejecuta como script, arranca el servidor
/* istanbul ignore next */
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
