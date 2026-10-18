import app from "./app.js";
import config from "./config/index.js";

async function main() {
  app.listen(config.port, () => {
    console.log(`🚀 Server is running on port ${config.port}`);
  });
}

main();
