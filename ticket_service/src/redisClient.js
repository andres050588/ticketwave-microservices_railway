import Redis from "ioredis"

const redis = new Redis(process.env.REDIS_URL, {
    connectTimeout: 5000,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        console.log(`Tentativo riconnessione Redis Nr${times} in ${delay}ms`)
        return delay
    }
})

redis.on("connect", () => {
    console.log("[ticket-service] ✅ Connesso a Redis")
})

redis.on("error", err => {
    console.error("❌ Errore connessione Redis:", err)
})

export default redis
