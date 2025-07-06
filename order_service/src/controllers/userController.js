import redis from "../redisClient.js"

export const getUserFromCache = async (req, res) => {
    const { userId } = req.params

    try {
        const cached = await redis.get(`user:${userId}`)

        if (!cached) {
            return res.status(404).json({ error: "Utente non trovato in cache" })
        }

        const user = JSON.parse(cached)
        res.json(user)
    } catch (err) {
        console.error("Errore lettura cache utente:", err)
        res.status(500).json({ error: "Errore lettura cache" })
    }
}
