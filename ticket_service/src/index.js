import express from "express"
import sequelize from "./config/db.js"
import Ticket from "./models/ticketModel.js"
import cors from "cors"
import routerTickets from "./routes/ticketRoutes.js"
import "./events/subscriber.js"

const app = express()

// Middleware
const whiteList = ["http://localhost:8080", "http://35.195.241.8", "https://ticketwave-kubernetes.vercel.app"]

app.use(
    cors({
        origin: true,
        credentials: true
    })
)
app.options(
    "*",
    cors({
        origin: whiteList,
        credentials: true
    })
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))

// Routes
app.use("/api", routerTickets)

// Connessione DB + avvio server
async function startServer() {
    try {
        await sequelize.authenticate()
        console.log("Connessione al database ticket_service riuscita!!")
        await sequelize.sync() // aggiungo { force: true } se voglio ressetare i dati nella db

        const PORT = process.env.PORT || 3002
        app.listen(PORT, () => {
            console.log(`Ticket service listening on port ${PORT}`)
        })
    } catch (error) {
        console.error("Errore nella connessione al DB:", error)
    }
}

startServer()
