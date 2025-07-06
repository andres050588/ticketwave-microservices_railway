import express from "express"
import { login, register, updateUserProfile, userProfile, userProfile_ByAdmin, usersList_ByAdmin } from "../controllers/authController.js"
import { verifyToken, verifyAdmin } from "../middleware/verifyToken.js"
import "../events/subscriber.js"

const routerAuth = express.Router()

routerAuth.post("/users/register", register)
routerAuth.post("/users/login", login)
routerAuth.get("/users/profile", verifyToken, userProfile)
routerAuth.put("/users/:id", verifyToken, updateUserProfile)

//Admin routes
routerAuth.get("/admin/users", verifyToken, verifyAdmin, usersList_ByAdmin)
routerAuth.get("/admin/users/:id", verifyToken, verifyAdmin, userProfile_ByAdmin)
export default routerAuth
