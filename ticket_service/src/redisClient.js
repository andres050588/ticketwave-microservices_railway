import Redis from "ioredis"

const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || ""
})

redis.on("connect", () => {
    console.log("[ticket-service] Connesso a Redis")
})

redis.on("error", err => {
    console.error("[ticket-service] ❌ Errore Redis:", err)
})

export default redis
