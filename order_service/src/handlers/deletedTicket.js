import Order from "../models/orderModel.js"
import { Op } from "sequelize"

// Questa funzione viene chiamata quando Redis riceve un messaggio dal canale "ticket-cancellato"
export default async function handleDeletedTicket(message) {
    try {
        let parsedMessage

        try {
            parsedMessage = JSON.parse(message)
        } catch (parseError) {
            console.warn("Messaggio non valido (non è JSON):", message)
            return
        }

        if (!parsedMessage || typeof parsedMessage !== "object") {
            console.warn("Messaggio non valido su 'ticket-cancellato':", parsedMessage)
            return
        }

        const { ticketId } = parsedMessage
        if (!ticketId) {
            console.warn("ticketId mancante nel messaggio 'ticket-cancellato'")
            return
        }

        // Trova tutti gli ordini ancora impegnati per quel biglietto
        const ordersToDelete = await Order.findAll({
            where: {
                ticketId,
                status: "impegnato"
            }
        })

        if (ordersToDelete.length === 0) {
            console.log("Nessun ordine da cancellare per ticket:", ticketId)
            return
        }

        // Cancella ciascun ordine trovato
        for (const order of ordersToDelete) {
            await order.destroy()
            console.log(`Ordine ${order.id} cancellato perché il biglietto è stato rimosso`)
        }
    } catch (error) {
        console.error("Errore durante la gestione di 'ticket-cancellato':", error)
    }
}
