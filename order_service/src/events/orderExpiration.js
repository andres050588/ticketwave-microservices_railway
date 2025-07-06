import Order from "../models/orderModel.js"
import redis from "../redisClient.js"
import { Op } from "sequelize"

export const emitExpiredOrders = async () => {
    const now = new Date()

    const expiredOrders = await Order.findAll({
        where: {
            status: "impegnato",
            expiresAt: { [Op.lt]: now }
        }
    })

    for (const order of expiredOrders) {
        await redis.publish(
            "ordine-scaduto",
            JSON.stringify({
                orderId: order.id,
                ticketId: order.ticketId,
                userId: order.userId
            })
        )

        await order.destroy()
    }
}
