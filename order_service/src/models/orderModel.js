import { DataTypes } from "sequelize"
import sequelize from "../config/db.js"

const Order = sequelize.define(
    "Order",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        status: {
            type: DataTypes.ENUM("impegnato", "acquistato", "scaduto"),
            allowNull: false,
            defaultValue: "impegnato"
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        ticketId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    },
    {
        tableName: "orders",
        timestamps: true
    }
)

export default Order
