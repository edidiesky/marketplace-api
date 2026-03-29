import { app } from "./app";
import logger from "./utils/logger";
import { bootstrapServer } from "./bootStrap";
import { registerShutdownHooks } from "./shutdown";
import { errorHandler, NotFound } from "./middleware/error-handler";

app.use(NotFound);
app.use(errorHandler);

const PORT = process.env.PORT;

async function main(): Promise<void> {
  await bootstrapServer();

  const server = app.listen(PORT, () => {
    logger.info(`Product server running on port ${PORT}`);
  });

  registerShutdownHooks(server);
}

main().catch((err) => {
  logger.error("Fatal: server failed to start", { error: err });
  process.exit(1);
});