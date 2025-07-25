import { Sequelize } from "sequelize"

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    dialect: "mysql",
    dialectOptions: {
        connectTimeout: 10000
    },
    logging: false
})

export default sequelize
