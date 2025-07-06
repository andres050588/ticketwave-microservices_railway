import { DataTypes } from "sequelize"
import sequelize from "../config/db.js"

const Ticket = sequelize.define(
    "Ticket",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4, //per generare un id unico ed sicuro
            primaryKey: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        eventDate: {
            type: DataTypes.DATE,
            allowNull: false,
            validate: {
                notEmpty: true,
                isDate: true
            }
        },
        status: {
            type: DataTypes.ENUM("disponibile", "impegnato", "acquistato"),
            defaultValue: "disponibile"
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        imageURL: {
            type: DataTypes.STRING,
            allowNull: false
        }
    },
    {
        tableName: "tickets",
        timestamps: true
    }
)

export default Ticket
