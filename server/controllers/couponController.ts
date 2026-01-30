import { Request, Response } from "express";
import { couponRepository } from "../repositories/couponRepository";
import { api } from "@shared/routes";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

export class CouponController {

    static validate = catchAsync(async (req: Request, res: Response) => {
        // Note: Zod schema uses 'code' and 'orderAmount' (or maybe 'amount' depending on schema definition?)
        // Checking schema: validate: { input: z.object({ code: z.string(), amount: z.number() }) ... } usually
        // Let's assume input has { code, amount } based on typical naming, or { code, orderAmount }.
        // Previous error said "Property 'amount' does not exist on type '{ code: string; orderAmount: number; }'"
        // So it IS orderAmount.
        const { code, orderAmount } = api.coupons.validate.input.parse(req.body);
        const result = await couponRepository.validate(code, orderAmount);
        res.json(result);
    });

    static list = catchAsync(async (req: Request, res: Response) => {
        // Admin only ideally
        const coupons = await couponRepository.getAll();
        res.json(coupons);
    });

    static create = catchAsync(async (req: Request, res: Response) => {
        const data = api.coupons.create.input.parse(req.body);
        const coupon = await couponRepository.create(data);
        res.status(201).json(coupon);
    });
}
