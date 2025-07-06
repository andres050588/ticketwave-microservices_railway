export const isAdmin = (request, response, next) => {
    if (!request.user || !requestuser.isAdmin) {
        return response.status(403).json({ error: "Accesso riservato agli amministratori" })
    }
    next()
}
