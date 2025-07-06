import Order from "../models/orderModel.js"
import redis from "../redisClient.js"
import { Op } from "sequelize"
// RECUPERO BIGLIETTO DALLA CACHE LOCALE

const getTicketById = async ticketId => {
    try {
        const ticketData = await redis.get(`ticket:${ticketId}`)
        if (!ticketData) return null
        return JSON.parse(ticketData)
    } catch (error) {
        console.error("Errore durante il recupero del ticket da Redis:", error)
        return null
    }
}
// CREA UN ORDINE
export const createOrder = async (req, res) => {
    try {
        const { ticketId } = req.body
        const userId = req.user.userId

        if (!ticketId) return res.status(400).json({ error: "ticketId è obbligatorio" })

        // Recupera il biglietto
        const ticket = await getTicketById(ticketId)
        if (!ticket) return res.status(404).json({ error: "Biglietto non trovato" })

        // Verifica se l'utente è il venditore del biglietto
        if (ticket.userId === userId) {
            return res.status(403).json({ error: "Non puoi acquistare un tuo biglietto" })
        }

        // Verifica se il biglietto è disponibile
        if (ticket.status !== "disponibile") return res.status(400).json({ error: "Biglietto non disponibile" })

        // Verifica se esiste già un ordine attivo per questo ticket
        const existingOrder = await Order.findOne({
            where: {
                ticketId,
                status: "impegnato",
                expiresAt: { [Op.gt]: new Date() }
            }
        })
        if (existingOrder) {
            return res.status(409).json({
                error: "Esiste già un ordine attivo per questo biglietto",
                existingOrderId: existingOrder.id
            })
        }

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) //scade fra 15 minuti

        ticket.status = "impegnato"
        await redis.set(`ticket:${ticket.id}`, JSON.stringify(ticket))

        const order = await Order.create({
            userId,
            ticketId,
            status: "impegnato",
            expiresAt
        })

        await redis.publish(
            "ordine-creato",
            JSON.stringify({
                orderId: order.id,
                ticketId: ticket.id,
                userId: userId,
                expiresAt
            })
        )

        res.status(201).json({
            orderId: order.id,
            ticketId: ticket.id,
            expiresAt
        })
    } catch (error) {
        console.error("Errore durante la creazione dell'ordine:", error)
        res.status(500).json({ error: "Errore interno del server" })
    }
}

// ORDINI DELL'UTENTE
export const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.userId
        const nowMinus2Min = new Date(Date.now() - 2 * 60 * 1000)

        const orders = await Order.findAll({
            where: {
                userId,
                [Op.or]: [{ status: { [Op.not]: "impegnato" } }, { status: "impegnato", expiresAt: { [Op.gte]: nowMinus2Min } }]
            },
            order: [["createdAt", "DESC"]]
        })

        // Recupera i dati dei ticket da Redis e aggiungili manualmente
        const enrichedOrders = await Promise.all(
            orders.map(async order => {
                const ticketData = await redis.get(`ticket:${order.ticketId}`)
                let ticket = null
                try {
                    ticket = ticketData ? JSON.parse(ticketData) : null
                } catch (e) {
                    console.error("Errore parsing JSON del ticket:", e)
                }

                return {
                    ...order.toJSON(),
                    ticket
                }
            })
        )

        res.json(enrichedOrders)
    } catch (error) {
        console.error("Errore nel recupero degli ordini:", error)
        res.status(500).json({ error: "Errore interno del server" })
    }
}

// MOSTRA BIGLIETTI ACQUISTATI
export const getPurchasedTickets = async (req, res) => {
    try {
        const userId = req.user.userId

        // Trova gli ordini acquistati
        const purchasedOrders = await Order.findAll({
            where: { userId, status: "acquistato" },
            order: [["createdAt", "DESC"]]
        })

        // Recupera dati biglietti da Redis per ogni ordine
        const purchasedTickets = await Promise.all(
            purchasedOrders.map(async order => {
                const ticketData = await redis.get(`ticket:${order.ticketId}`)
                let ticket = null
                try {
                    ticket = ticketData ? JSON.parse(ticketData) : null
                } catch (e) {
                    console.error("Errore parsing JSON del ticket:", e)
                }
                return ticket
            })
        )

        res.json(purchasedTickets.filter(t => t !== null))
    } catch (error) {
        console.error("Errore nel recupero biglietti acquistati:", error)
        res.status(500).json({ error: "Errore interno del server" })
    }
}

// ANNULLA ORDINE
export const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id
        const userId = req.user.userId

        const order = await Order.findByPk(orderId)
        if (!order) return res.status(404).json({ error: "Ordine non trovato" })
        if (order.userId !== userId) return res.status(403).json({ error: "Accesso negato all'ordine" })
        if (order.status !== "impegnato") return res.status(400).json({ error: "Solo ordini 'impegnato' possono essere annullati" })

        const ticketData = await redis.get(`ticket:${order.ticketId}`)
        if (ticketData) {
            const ticket = JSON.parse(ticketData)
            ticket.status = "disponibile"
            await redis.set(`ticket:${ticket.id}`, JSON.stringify(ticket))
        }

        await order.destroy()

        await redis.publish(
            "ordine-annullato",
            JSON.stringify({
                orderId: order.id,
                ticketId: order.ticketId,
                userId: order.userId
            })
        )

        res.json({ message: "Ordine annullato e biglietto disponibile" })
    } catch (error) {
        console.error("Errore nell'annullamento ordine:", error)
        res.status(500).json({ error: "Errore server" })
    }
}

// COMPLETA ORDINE
export const completeOrder = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user.userId

        const order = await Order.findOne({
            where: { id, userId },
            include: []
        })

        if (!order) return res.status(404).json({ error: "Ordine non trovato" })
        if (order.status !== "impegnato") return res.status(400).json({ error: "Ordine non disponibile per completamento" })
        if (new Date(order.expiresAt) < new Date()) return res.status(400).json({ error: "Ordine scaduto" })

        await order.update({ status: "acquistato" })

        const ticketData = await redis.get(`ticket:${order.ticketId}`)
        if (ticketData) {
            const ticket = JSON.parse(ticketData)
            ticket.status = "acquistato"
            await redis.set(`ticket:${ticket.id}`, JSON.stringify(ticket))
        }

        await redis.publish(
            "ordine-completato",
            JSON.stringify({
                orderId: order.id,
                ticketId: order.ticketId,
                userId: order.userId
            })
        )

        res.status(200).json({
            message: "Ordine completato con successo",
            orderId: order.id,
            ticket: {
                ticketId: order.ticketId,
                status: "acquistato"
            }
        })
    } catch (error) {
        console.error("Errore nel completamento ordine:", error)
        res.status(500).json({ error: "Errore interno del server" })
    }
}
