import redis from "../redisClient.js"

async function startRedisSubscribers() {
    const subscriber = redis.duplicate()

    await subscriber.subscribe("user-aggiornato")

    subscriber.on("message", async (channel, message) => {
        if (channel === "user-aggiornato") {
            console.log("Messaggio ricevuto su canale:", channel)
            console.log("Messaggio ricevuto (raw):", message)

            try {
                const updatedUser = JSON.parse(message)

                if (!updatedUser?.id || (!updatedUser.name && !updatedUser.email)) {
                    console.warn("Messaggio incompleto o non valido:", updatedUser)
                    return
                }

                await redis.set(`user:${updatedUser.id}`, JSON.stringify(updatedUser))

                console.log(`Redis aggiornato per utente ${updatedUser.id}`)
            } catch (err) {
                console.error("❌ Errore nel parsing o salvataggio in Redis:", err)
            }
        }
    })

    console.log("Subscriber 'user-aggiornato' attivo")
}

startRedisSubscribers()
