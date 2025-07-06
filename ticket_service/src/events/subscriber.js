import redis from "../redisClient.js"
import Ticket from "../models/ticketModel.js"

const subscriber = redis.duplicate()

await subscriber.subscribe("ordine-completato")
await subscriber.subscribe("ordine-annullato")
await subscriber.subscribe("ordine-creato")
await subscriber.subscribe("user-aggiornato")
await subscriber.subscribe("ordine-scaduto")

subscriber.on("message", async (channel, message) => {
    if (channel === "ordine-completato") {
        let data
        try {
            data = JSON.parse(message)
        } catch (err) {
            console.error(`[ticket_service] ❌ Errore parsing JSON su ${channel}:`, message)
            return
        }

        const ticketId = data?.ticketId
        if (!ticketId) {
            console.warn(`[ticket_service] ⚠️ ticketId mancante nel messaggio:`, data)
            return
        }

        const ticket = await Ticket.findByPk(ticketId)
        if (!ticket) {
            console.warn(`[ticket_service] ⚠️ Ticket ${ticketId} non trovato nel DB`)
            return
        }

        await ticket.update({ status: "acquistato" })
        await redis.set(`ticket:${ticketId}`, JSON.stringify(ticket))

        console.log(`[ticket_service] Ticket ${ticketId} aggiornato a "acquistato"`)
        console.log(`[ticket_service] Cache aggiornata per ticket:${ticketId}`)
    }

    if (channel === "ordine-annullato") {
        let data
        try {
            data = JSON.parse(message)
        } catch (err) {
            console.error(`[ticket_service] ❌ Errore parsing JSON su ${channel}:`, message)
            return
        }

        const ticketId = data?.ticketId
        if (!ticketId) {
            console.warn(`[ticket_service] ⚠️ ticketId mancante nel messaggio:`, data)
            return
        }

        const ticket = await Ticket.findByPk(ticketId)
        if (!ticket) {
            console.warn(`[ticket_service] ⚠️ Ticket ${ticketId} non trovato nel DB`)
            return
        }

        await ticket.update({ status: "disponibile" })
        await redis.set(`ticket:${ticketId}`, JSON.stringify(ticket))

        console.log(`[ticket_service] Ticket ${ticketId} aggiornato a "disponibile"`)
        console.log(`[ticket_service] Cache aggiornata per ticket:${ticketId}`)
    }

    if (channel === "ordine-scaduto") {
        let data
        try {
            data = JSON.parse(message)
        } catch (err) {
            console.error(`[ticket_service] ❌ Errore parsing JSON su ${channel}:`, message)
            return
        }

        const ticketId = data?.ticketId
        if (!ticketId) {
            console.warn(`[ticket_service] ⚠️ ticketId mancante nel messaggio:`, data)
            return
        }

        const ticket = await Ticket.findByPk(ticketId)
        if (!ticket) {
            console.warn(`[ticket_service] ⚠️ Ticket ${ticketId} non trovato nel DB`)
            return
        }

        if (ticket.status === "impegnato") {
            await ticket.update({ status: "disponibile" })
            await redis.set(`ticket:${ticketId}`, JSON.stringify(ticket))

            console.log(`[ticket_service] Ticket ${ticketId} scaduto: aggiornato a "disponibile"`)
            console.log(`[ticket_service] Cache aggiornata per ticket:${ticketId}`)
        }
    }

    if (channel === "ordine-creato") {
        let data
        try {
            data = JSON.parse(message)
        } catch (err) {
            console.error(`[ticket_service] ❌ Errore parsing JSON su ${channel}:`, message)
            return
        }

        const ticketId = data?.ticketId
        if (!ticketId) {
            console.warn(`[ticket_service] ⚠️ ticketId mancante nel messaggio:`, data)
            return
        }

        const ticket = await Ticket.findByPk(ticketId)
        if (!ticket) {
            console.warn(`[ticket_service] ⚠️ Ticket ${ticketId} non trovato nel DB`)
            return
        }

        await ticket.update({ status: "impegnato" })
        await redis.set(`ticket:${ticketId}`, JSON.stringify(ticket))

        console.log(`[ticket_service] Ticket ${ticketId} aggiornato a "impegnato"`)
        console.log(`[ticket_service] Cache aggiornata per ticket:${ticketId}`)
    }

    if (channel === "user-aggiornato") {
        let data
        try {
            data = JSON.parse(message)
        } catch (err) {
            console.error(`[ticket_service] ❌ Errore parsing JSON su ${channel}:`, message)
            return
        }

        if (!data?.id || !data.name || !data.email) {
            console.warn(`[ticket_service] ⚠️ Dati utente incompleti in user-aggiornato:`, data)
            return
        }

        await redis.set(`user:${data.id}`, JSON.stringify(data))
        console.log(`[ticket_service] Cache aggiornata per utente ${data.id}`)
    }
})

console.log("[ticket_service] Subscriber attivo per ordine-creato, ordine-completato, ordine-annullato, ordine-scaduto e user-aggiornato")
