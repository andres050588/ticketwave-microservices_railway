import express from "express"
import redis from "./redisClient.js"

import handleTicketCreato from "./handlers/ticketCreato.js"
import handleOrdineCreato from "./handlers/ordineCreato.js"
import handleUserAggiornato from "./handlers/userAggiornato.js"
import handleOrdineCompletato from "./handlers/ordineCompletato.js"
import handleOrdineAnnullato from "./handlers/ordineAnnullato.js"
import handleTicketCancellato from "./handlers/ticketCancellato.js"

const app = express()
app.use(express.json())

// Pubblicazione
app.post("/publish", async (req, res) => {
    const { channel, message } = req.body
    await redis.publish(channel, JSON.stringify(message))
    res.send("Messaggio pubblicato.")
})

// Sottoscrizioni
const subscriber = redis.duplicate()
const canali = ["user-aggiornato", "ticket-creato", "ticket-cancellato", "ordine-creato", "ordine-annullato", "ordine-completato"]
subscriber.subscribe(canali, () => {
    console.log("Iscritto ai canali:", canali.join(", "))
})

subscriber.on("message", async (channel, message) => {
    try {
        if (channel === "ticket-creato") await handleTicketCreato(message)
        else if (channel === "ordine-creato") await handleOrdineCreato(message)
        else if (channel === "user-aggiornato") await handleUserAggiornato(message)
        else if (channel === "ordine-completato") await handleOrdineCompletato(message)
        else if (channel === "ordine-annullato") await handleOrdineAnnullato(message)
        else if (channel === "ticket-cancellato") await handleTicketCancellato(message)
    } catch (err) {
        console.error(`❌ Errore handler per ${channel}:`, err)
    }
})

const PORT = process.env.PORT || 3004
app.listen(PORT, () => {
    console.log(`Redis API Service in ascolto sulla porta ${PORT}`)
})
