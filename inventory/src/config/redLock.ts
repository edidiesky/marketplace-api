import Redlock from "redlock";
import redisClient from "../config/redis";

const redlock = new Redlock([redisClient], {
  driftFactor: 0.01,
  retryCount: 3,       
  retryDelay: 100,        
  retryJitter: 50,      
  automaticExtensionThreshold: 500,
});


export default redlock