import handleDeletedTicket from "../handlers/deletedTicket.js"
import redis from "../redisClient.js"

export async function startRedisSubscribers() {
    const subscriber = redis.duplicate()

    await subscriber.subscribe("user-aggiornato")
    await subscriber.subscribe("ticket-creato")
    await subscriber.subscribe("ticket-cancellato")

    subscriber.on("message", async (channel, message) => {
        if (channel === "user-aggiornato") {
            try {
                const userData = JSON.parse(message)
                if (!userData.id || !userData.email) return

                await cacheUserData(userData)
                console.log("Utente aggiornato nella cache:", userData.id)
            } catch (err) {
                console.error("❌ Errore nel parsing user-aggiornato:", err)
            }
        } else if (channel === "ticket-cancellato") {
            try {
                await handleDeletedTicket(message)
            } catch (err) {
                console.error("❌ Errore nella gestione di 'ticket-cancellato':", err)
            }
        } else if (channel === "ticket-creato") {
            try {
                const ticketData = JSON.parse(message)
                if (!ticketData.id || !ticketData.title || !ticketData.price) return

                await cacheTicketData(ticketData)
            } catch (err) {
                console.error("❌ Errore nel parsing ticket-creato:", err)
            }
        }
    })

    console.log("[order_service] Subscriber attivo per user-aggiornato, ticket-cancellato e ticket-creato")

    // -------------Cache User_Data e Cache_Ticket_Data-------------

    async function cacheUserData(user) {
        const key = `user:${user.id}`
        const value = JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email
        })

        try {
            await redis.set(key, value)
            console.log(`Cache aggiornata per ${key}`)
        } catch (err) {
            console.error("❌ Errore nel salvataggio in cache Redis:", err)
        }
    }

    async function cacheTicketData(ticket) {
        const key = `ticket:${ticket.id}`
        const value = JSON.stringify({
            id: ticket.id,
            title: ticket.title,
            price: ticket.price,
            eventDate: ticket.eventDate,
            userId: ticket.userId,
            status: ticket.status
        })

        try {
            await redis.set(key, value)
            console.log(`💾 Ticket salvato in cache: ${key}`)
        } catch (err) {
            console.error("❌ Errore nel salvataggio del ticket in cache Redis:", err)
        }
    }
}
