const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ message: "Hello from DevSecOps technical test!" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Fix coverage test - función exportable y testeable
function startServer(customPort) {
  const p = customPort ?? port; // si no envían puerto, usa 3000
  return app.listen(p, () => {
    console.log(`App listening on port ${p}`);
  });
}

// // Fix coverage test - si se ejecuta como script, arranca el servidor
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };