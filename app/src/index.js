const express = require("express");

const app = express();

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ message: "Hello from DevSecOps technical test to CBCO!!!" });
});

app.get("/health", (req, res) => {
  const full = req.query.full === "true";

  if (full) {
    return res.status(200).json({ status: "ok", mode: "full" });
  }

  return res.status(200).json({ status: "ok" });
});

// Fix coverage test - función exportable y testeable
// ✅ función exportable y testeable (sin branch por ??)
function startServer(customPort = port) {
  return app.listen(customPort, () => {
    console.log(`App listening on port ${customPort}`);
  });
}

// // Fix coverage test - si se ejecuta como script, arranca el servidor

/* istanbul ignore next */
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };