import Redis from "ioredis"

const redis = new Redis({
    host: process.env.REDIS_URL, // es: redis.upstash.io
    port: Number(process.env.REDIS_PORT), // es: 6379
    username: process.env.REDIS_USER || "default",
    password: process.env.REDIS_PASSWORD,
    tls: {}, // ✅ IMPORTANTE per Railway / Upstash
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        console.log(`Tentativo riconnessione Redis Nr${times} in ${delay}ms`)
        return delay
    },
    connectTimeout: 5000
})

redis.on("connect", () => {
    console.log("[user-service] ✅ Connesso a Redis")
})

redis.on("error", err => {
    console.error("❌ Errore connessione Redis:", err)
})

export default redis
