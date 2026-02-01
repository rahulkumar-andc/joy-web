import { Router } from "express";
import { api } from "@shared/routes";
import { requireAdmin } from "../middleware/auth";
import { restrictTo } from "../middleware/rbac";
import { CouponController } from "../controllers/couponController";

export const couponsRouter = Router();

// === COUPONS ROUTES ===
couponsRouter.post(api.coupons.validate.path, CouponController.validate);

couponsRouter.post(api.coupons.create.path, restrictTo("admin", "manager"), CouponController.create);

couponsRouter.get(api.coupons.list.path, restrictTo("admin", "manager"), CouponController.list);

couponsRouter.delete(api.coupons.delete.path, restrictTo("admin", "manager"), CouponController.delete);

