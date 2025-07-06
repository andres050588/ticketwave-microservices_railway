import express from "express"
import sequelize from "./config/db.js"
import authRoutes from "./routes/authRoutes.js"
import cors from "cors"
import redis from "./redisClient.js"
import "./events/subscriber.js"

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

app.use("/api", authRoutes)

const MAX_RETRY = 3
async function startServer(retry = MAX_RETRY) {
    try {
        await sequelize.authenticate()
        console.log("Connessione al database user_service riuscita!")
        await sequelize.sync({ force: true }) // aggiungo { force: true } se voglio ressetare i dati nella db

        const PORT = process.env.PORT || 3001
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`User service listening on port ${PORT}`)
        })
    } catch (error) {
        console.error("❌ Errore connessione DB:", error)
        if (retry > 0) {
            console.log(`Riprovo a connettermi... Tentativi rimasti: ${retry}`)
            setTimeout(() => startServer(retry - 1), 5000)
        } else {
            console.error("Impossibile connettersi al db dopo vari tentativi.")
        }
    }
}

startServer()
