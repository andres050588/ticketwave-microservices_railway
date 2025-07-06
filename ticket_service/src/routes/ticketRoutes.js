import express from "express"
import { createTicket, getTicketById, availableTickets, getMyTickets, getTicketsBySeller, deleteTicket } from "../controllers/ticketController.js"
import { verifyToken, verifyAdmin } from "../middleware/verifyToken.js"
import multerUpload from "../middleware/multerUpload.js"

const routerTickets = express.Router()

// POST /api/tickets creazione del biglietto ed upload con multer della photo biglietto
routerTickets.post("/tickets", verifyToken, multerUpload.single("image"), createTicket)
// GET /api/tickets - ritorna tutti i biglietti disponibili da ../controllers/ticketController.js
routerTickets.get("/tickets", availableTickets)
// GET /api/tickets/mytickets - ritorna la lista dei biglietti dell'utente loggato
routerTickets.get("/tickets/mytickets", verifyToken, getMyTickets)
// GET /api/tickets/seller/:userId - restituisce i biglietti di un utente
routerTickets.get("/tickets/seller/:userId", getTicketsBySeller)
// GET /api/tickets/:id - ritorna info dell biglietto scelto
routerTickets.get("/tickets/:id", getTicketById)
// DELETE /api/tickets/:id - Cancella un biglietto se appartiene all'utente loggato o è admin
routerTickets.delete("/tickets/:id", verifyToken, deleteTicket)

// Fallback: cattura rotte non definite
routerTickets.all("/*", (req, res) => {
    res.status(404).json({ message: "Endpoint non trovato in /api/tickets" })
})

export default routerTickets
