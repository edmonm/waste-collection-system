import { config } from "./config.js";
import { connectDatabase } from "./db.js";
import { app } from "./app.js";

try {
  await connectDatabase();
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`Waste collection API listening on port ${config.port}`);
  });
} catch (error) {
  console.error("Unable to start the API:", error.message);
  process.exitCode = 1;
}
