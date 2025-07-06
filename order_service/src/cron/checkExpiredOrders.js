import Order from "../models/orderModel.js"
import redis from "../redisClient.js"
import { Op } from "sequelize"

const checkExpiredOrders = async () => {
    const now = new Date()

    const expiredOrders = await Order.findAll({
        where: {
            status: "impegnato",
            expiresAt: { [Op.lt]: now }
        }
    })

    for (const order of expiredOrders) {
        // Recupera ticket dalla cache
        const ticketData = await redis.get(`ticket:${order.ticketId}`)
        if (!ticketData) continue

        let ticket
        try {
            ticket = JSON.parse(ticketData)
        } catch (err) {
            console.warn(`[order_service] ❌ Ticket ${order.ticketId} non valido in cache`)
            continue
        }

        if (ticket.status === "impegnato") {
            ticket.status = "disponibile"
            await redis.set(`ticket:${ticket.id}`, JSON.stringify(ticket))

            await redis.publish(
                "ordine-scaduto",
                JSON.stringify({
                    orderId: order.id,
                    ticketId: ticket.id,
                    userId: order.userId
                })
            )
        }

        await order.destroy()
    }
}

export default checkExpiredOrders
