// import axios from "axios";
// import logger from "../utils/logger";
// import { QUEUES } from "../constants";
// import { exec } from "child_process";
// import util from "util";
// import promClient from "prom-client";

// const execPromise = util.promisify(exec);

// // Prometheus setup
// promClient.collectDefaultMetrics();
// const queueLengthGauge = new promClient.Gauge({
//   name: "rabbitmq_queue_length",
//   help: "Number of messages in RabbitMQ queues",
//   labelNames: ["queue"],
// });

// interface QueueInfo {
//   name: string;
//   messages: number;
//   consumers: number;
// }

// const RABBITMQ_API_URL = process.env.RABBITMQ_MANAGEMENT_URL || "http://localhost:15672/api/queues";
// const RABBITMQ_USER = "guest";
// const RABBITMQ_PASS = "guest";
// const QUEUE_THRESHOLD = 1000;
// const MAX_CONSUMERS = 5;

// const monitorQueues = async () => {
//   try {
//     const response = await axios.get<QueueInfo[]>(RABBITMQ_API_URL, {
//       auth: {
//         username: RABBITMQ_USER,
//         password: RABBITMQ_PASS,
//       },
//     });

//     const queues = response.data;
//     for (const queue of queues) {
//       if (Object.values(QUEUES).includes(queue.name)) {
//         // Update Prometheus metric
//         queueLengthGauge.set({ queue: queue.name }, queue.messages);

//         logger.info("RabbitMQ Queue Status", {
//           queue: queue.name,
//           messageCount: queue.messages,
//           consumerCount: queue.consumers,
//         });

//         if (queue.messages > QUEUE_THRESHOLD && queue.consumers < MAX_CONSUMERS) {
//           logger.info("Scaling up auth service due to high queue length", {
//             queue: queue.name,
//             messageCount: queue.messages,
//           });
//           await scaleAuthService(queue.consumers + 1);
//         } else if (queue.messages < QUEUE_THRESHOLD / 2 && queue.consumers > 1) {
//           logger.info("Scaling down auth service due to low queue length", {
//             queue: queue.name,
//             messageCount: queue.messages,
//           });
//           await scaleAuthService(queue.consumers - 1);
//         }
//       }
//     }
//   } catch (error) {
//     logger.error("Error monitoring RabbitMQ queues", { error });
//   }
// };

// const scaleAuthService = async (replicas: number) => {
//   try {
//     await execPromise(`docker-compose up -d --scale auth=${replicas}`);
//     logger.info("Scaled auth service", { replicas });
//   } catch (error) {
//     logger.error("Error scaling auth service", { error, replicas });
//   }
// };

// // Expose /metrics endpoint
// import express from "express";
// const app = express();
// app.get("/metrics", async (req, res) => {
//   res.set("Content-Type", promClient.register.contentType);
//   res.end(await promClient.register.metrics());
// });
// app.listen(9090, () => logger.info("Prometheus metrics exposed on port 9090"));

// const startQueueMonitoring = () => {
//   setInterval(monitorQueues, 60 * 1000);
//   logger.info("Started RabbitMQ queue monitoring");
// };

// export { monitorQueues, startQueueMonitoring };