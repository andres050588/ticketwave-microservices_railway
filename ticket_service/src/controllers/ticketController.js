import Ticket from "../models/ticketModel.js"
import redis from "../redisClient.js"
import { Op } from "sequelize"

// CREAZIONE DI UN BIGLIETTO
export const createTicket = async (req, res) => {
    try {
        const { title, price, eventDate } = req.body
        const userId = req.user.userId

        if (!req.file || !req.file.path) {
            return res.status(400).json({ error: "L'immagine è obbligatoria" })
        }
        const imageURL = req.file?.secure_url || req.file?.path

        // Validazioni
        if (!title || !price || !eventDate) {
            return res.status(400).json({ error: "Campi obbligatori mancanti" })
        }
        if (isNaN(Date.parse(eventDate))) {
            return res.status(400).json({ error: "La data evento non è valida" })
        }
        if (title.length < 3 || title.length > 100) {
            return res.status(400).json({ error: "Il titolo deve avere tra 3 e 100 caratteri" })
        }
        if (isNaN(price) || price <= 0) {
            return res.status(400).json({ error: "Il prezzo deve essere un numero positivo" })
        }
        if (!/^\d+(\.\d{1,2})?$/.test(price.toString())) {
            return res.status(400).json({ error: "Formato prezzo non valido" })
        }

        const newTicket = await Ticket.create({
            title,
            price,
            eventDate,
            imageURL,
            status: "disponibile",
            userId
        })
        await redis.set(`ticket:${newTicket.id}`, JSON.stringify(newTicket))
        // 🔔 Pubblica evento Redis per la creazione di un nuovo biglietto
        await redis.publish(
            "ticket-creato",
            JSON.stringify({
                id: newTicket.id,
                title: newTicket.title,
                price: newTicket.price,
                eventDate: newTicket.eventDate,
                userId: newTicket.userId,
                status: newTicket.status
            })
        )

        const createdTicket = await Ticket.findByPk(newTicket.id)

        let seller = null
        const userData = await redis.get(`user:${createdTicket.userId}`)
        if (userData) {
            try {
                seller = JSON.parse(userData)
            } catch (parseError) {
                console.warn(`Dati utente corrotti in Redis per ID ${createdTicket.userId}:`, parseError)
            }
        }

        return res.status(201).json({
            id: createdTicket.id,
            title: createdTicket.title,
            price: createdTicket.price,
            eventDate: createdTicket.eventDate,
            imageURL: createdTicket.imageURL || "URL immagine non disponibile",
            status: createdTicket.status,
            createdAt: createdTicket.createdAt,
            venditore: seller
                ? {
                      id: seller.id,
                      name: seller.name,
                      email: seller.email
                  }
                : null
        })
    } catch (error) {
        console.error("Errore durante la creazione del biglietto:", error)
        res.status(500).json({ error: "Errore del server", message: error.message, stack: error.stack })
    }
}

// LISTA BIGLIETTI DISPONIBILI
export const availableTickets = async (req, res) => {
    try {
        const tickets = await Ticket.findAll({
            where: { status: "disponibile" },
            order: [["createdAt", "DESC"]]
        })

        const allTickets = await Promise.all(
            tickets.map(async ticket => {
                let seller = null
                let fallback = false

                try {
                    const userData = await redis.get(`user:${ticket.userId}`)
                    if (userData) {
                        try {
                            seller = JSON.parse(userData)
                        } catch (parseError) {
                            console.warn(`Dati corrotti per utente ${ticket.userId}:`, parseError)
                            fallback = true
                        }
                    } else {
                        fallback = true
                    }
                } catch (redisError) {
                    console.warn(`Errore connessione Redis per utente ${ticket.userId}:`, redisError)
                    fallback = true
                }

                return {
                    id: ticket.id,
                    title: ticket.title,
                    price: ticket.price,
                    status: ticket.status,
                    prenotato: ticket.status === "impegnato",
                    venduto: ticket.status === "acquistato",
                    disponibile: ticket.status === "disponibile",
                    userId: ticket.userId,
                    createdAt: ticket.createdAt,
                    eventDate: ticket.eventDate,
                    imageURL: ticket.imageURL,
                    venditore: seller
                        ? {
                              id: seller.id,
                              name: seller.name,
                              email: seller.email
                          }
                        : {
                              id: null,
                              name: "Non disponibile",
                              email: null
                          },
                    venditoreFallback: fallback
                }
            })
        )

        res.json(allTickets)
    } catch (error) {
        console.error("Errore nel recupero dei biglietti disponibili:", error)
        res.status(500).json({ error: "Errore del server" })
    }
}

export const getTicketById = async (req, res) => {
    try {
        const { id } = req.params

        const ticket = await Ticket.findByPk(id)
        if (!ticket) {
            return res.status(404).json({ error: "Biglietto non trovato" })
        }

        let seller = null
        let fallback = false

        try {
            const userData = await redis.get(`user:${ticket.userId}`)
            if (userData) {
                try {
                    seller = JSON.parse(userData)
                } catch (parseError) {
                    console.warn(`Dati utente corrotti in Redis per ID ${ticket.userId}:`, parseError)
                    fallback = true
                }
            } else {
                fallback = true
            }
        } catch (redisError) {
            console.warn(`Errore Redis per utente ${ticket.userId}:`, redisError)
            fallback = true
        }

        res.json({
            id: ticket.id,
            title: ticket.title,
            price: ticket.price,
            status: ticket.status,
            prenotato: ticket.status === "impegnato",
            venduto: ticket.status === "acquistato",
            disponibile: ticket.status === "disponibile",
            userId: ticket.userId,
            createdAt: ticket.createdAt,
            eventDate: ticket.eventDate,
            imageURL: ticket.imageURL,
            venditore: seller
                ? {
                      id: seller.id,
                      name: seller.name,
                      email: seller.email
                  }
                : {
                      id: null,
                      name: "Non disponibile",
                      email: null
                  },
            venditoreFallback: fallback
        })
    } catch (error) {
        console.error("Errore nel recupero del biglietto:", error)
        res.status(500).json({ error: "Errore del server" })
    }
}

export const getMyTickets = async (req, res) => {
    try {
        const userId = req.user.userId

        const tickets = await Ticket.findAll({
            where: {
                userId,
                status: {
                    [Op.ne]: "acquistato"
                }
            },
            order: [["createdAt", "DESC"]]
        })

        const ticketsArricchiti = await Promise.all(
            tickets.map(async ticket => {
                let seller = null
                let fallback = false

                try {
                    const userData = await redis.get(`user:${ticket.userId}`)
                    if (userData) {
                        try {
                            seller = JSON.parse(userData)
                        } catch (parseErr) {
                            console.warn(`Dati corrotti per utente ${ticket.userId}:`, parseErr)
                            fallback = true
                        }
                    } else {
                        fallback = true
                    }
                } catch (redisErr) {
                    console.warn(`Errore Redis per utente ${ticket.userId}:`, redisErr)
                    fallback = true
                }

                return {
                    id: ticket.id,
                    title: ticket.title,
                    price: ticket.price,
                    status: ticket.status,
                    prenotato: ticket.status === "impegnato",
                    venduto: ticket.status === "acquistato",
                    disponibile: ticket.status === "disponibile",
                    userId: ticket.userId,
                    createdAt: ticket.createdAt,
                    eventDate: ticket.eventDate,
                    imageURL: ticket.imageURL,
                    venditore: seller
                        ? {
                              id: seller.id,
                              name: seller.name,
                              email: seller.email
                          }
                        : {
                              id: null,
                              name: "Non disponibile",
                              email: null
                          },
                    venditoreFallback: fallback
                }
            })
        )

        res.json(ticketsArricchiti)
    } catch (error) {
        console.error("Errore nel recupero dei biglietti personali:", error)
        res.status(500).json({ error: "Errore del server" })
    }
}
// LISTA DEI BIGLIETTI PER UTENTE
export const getTicketsBySeller = async (req, res) => {
    try {
        const { userId } = req.params
        console.log("📩 userId ricevuto dal path:", userId)
        const tickets = await Ticket.findAll({
            where: {
                userId,
                status: {
                    [Op.ne]: "acquistato"
                }
            },
            order: [["createdAt", "DESC"]]
        })

        const userCache = {} // Cache locale per evitare richieste duplicate

        const enrichedTickets = await Promise.all(
            tickets.map(async ticket => {
                let seller = null
                let fallback = false

                try {
                    if (userCache[ticket.userId]) {
                        seller = userCache[ticket.userId]
                    } else {
                        const userData = await redis.get(`user:${ticket.userId}`)
                        if (userData) {
                            seller = JSON.parse(userData)
                            userCache[ticket.userId] = seller
                        } else {
                            fallback = true
                        }
                    }
                } catch (err) {
                    console.warn(`Errore Redis utente ${ticket.userId}`, err)
                    fallback = true
                }

                return {
                    id: ticket.id,
                    title: ticket.title,
                    price: ticket.price,
                    status: ticket.status,
                    eventDate: ticket.eventDate,
                    imageURL: ticket.imageURL,
                    userId: ticket.userId,
                    createdAt: ticket.createdAt,
                    venditore: seller
                        ? {
                              id: seller.id,
                              name: seller.name,
                              email: seller.email
                          }
                        : {
                              id: null,
                              name: "Non disponibile",
                              email: null
                          },
                    venditoreFallback: fallback
                }
            })
        )

        res.json(enrichedTickets)
    } catch (err) {
        console.error("Errore nel recupero biglietti del venditore:", err)
        res.status(500).json({ error: "Errore del server" })
    }
}
// CANCELLARE UN BIGLIETTO

export const deleteTicket = async (request, response) => {
    const ticketId = request.params.id
    const userId = request.user.userId
    const isAdmin = request.isAdmin

    try {
        const ticketToDelete = await Ticket.findByPk(ticketId)
        if (!ticketToDelete) return response.status(404).json({ error: "Biglietto non trovato" })
        if (ticketToDelete.status === "acquistato") {
            return response.status(400).json({ error: "Non puoi cancellare un biglietto già acquistato" })
        }

        if (ticketToDelete.userId !== userId && !isAdmin) {
            return response.status(403).json({ error: "Non hai i permessi per cancellare questo biglietto" })
        }

        // Cancello dal DB e da Redis
        await ticketToDelete.destroy()
        await redis.del(`ticket:${ticketId}`)
        // 🔔 Pubblica evento Redis per la cancellazione del biglietto
        await redis.publish(
            "ticket-cancellato",
            JSON.stringify({
                id: ticketToDelete.id,
                userId: ticketToDelete.userId,
                title: ticketToDelete.title,
                reason: "deleted_by_owner"
            })
        )
        console.log(`Biglietto ${ticketId} cancellato da utente ${userId}${isAdmin ? " (admin)" : ""}`)

        return response.json({ message: "Biglietto cancellato con successo" })
    } catch (error) {
        console.error("Errore nella cancellazione del biglietto:", error)
        response.status(500).json({ error: "Errore del server" })
    }
}
