import Redis from "ioredis"
import dns from "dns"

dns.lookup("redis.railway.internal", (err, address, family) => {
    if (err) console.error("DNS lookup fallito:", err)
    else console.log(`DNS lookup riuscito: ${address} (IPv${family})`)
})

const redis = new Redis(process.env.REDIS_URL, {
    tls: {}, // ☑️ TLS necessario
    family: 6, // ☑️ IPv6 obbligatorio per .railway.internal
    connectTimeout: 5000,
    retryStrategy(times) {
        const delay = Math.min(times * 100, 2000)
        console.log(`Tentativo riconnessione Redis Nr${times} in ${delay}ms`)
        return delay
    }
})

redis.on("connect", () => {
    console.log("[user-service] ✅ Connesso a Redis")
})

redis.on("error", err => {
    console.error("❌ Errore connessione Redis:", err)
})

export default redis
