import express from "express"
import "./events/subscriber.js"
import sequelize from "./config/db.js"
import { startRedisSubscribers } from "./events/subscriber.js"
import routerOrders from "./routes/orderRoutes.js"
import cors from "cors"
import cron from "node-cron"
import checkExpiredOrders from "./cron/checkExpiredOrders.js"

const app = express()

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
app.use(express.json())

app.use("/api", routerOrders)

const PORT = process.env.PORT || 3003

cron.schedule("*/1 * * * *", async () => {
    console.log("[order_service] 🔁 Controllo ordini scaduti...")
    await checkExpiredOrders()
})

async function startServer() {
    let retries = 5
    while (retries) {
        try {
            await sequelize.authenticate()
            console.log("Connessione al database order_service riuscita!")
            break
        } catch (err) {
            console.error("❌ Connessione al DB fallita, ritento...", err.message)
            retries -= 1
            await new Promise(res => setTimeout(res, 5000))
        }
    }

    if (!retries) {
        console.error("❌ Impossibile connettersi al DB dopo vari tentativi.")
        process.exit(1)
    }

    try {
        await sequelize.sync({}) // aggiungo { force: true } se voglio ressetare i dati nella db
        console.log("Modello Order Sequelize sincronizzato")

        await startRedisSubscribers()
        app.listen(PORT, () => {
            console.log(`🎧 Order Service attivo sulla porta ${PORT}`)
        })
    } catch (err) {
        console.error("❌ Errore nell'avvio del server:", err)
    }
}

startServer()
