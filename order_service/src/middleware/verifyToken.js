import jwt from "jsonwebtoken"

const extractTokenFromHeader = authHeader => {
    if (!authHeader || typeof authHeader !== "string") return null
    const parts = authHeader.split(" ")
    if (parts.length !== 2 || parts[0] !== "Bearer") return null
    return parts[1]
}

export const verifyToken = (req, res, next) => {
    const token = extractTokenFromHeader(req.headers.authorization)
    if (!token) return res.status(401).json({ error: "Token assente o malformato" })

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(403).json({ error: "Token non valido" })
    }
}

export const verifyAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) return res.status(403).json({ error: "Accesso riservato agli admin" })
    next()
}
