import { Request, Response } from "express";
import { contentRepository } from "../repositories/contentRepository";
import { cacheService, CacheKeys } from "../cache";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

export class CommonController {

    static getHomepage = catchAsync(async (req: Request, res: Response) => {
        const cached = await cacheService.get(CacheKeys.HOMEPAGE);
        if (cached) return res.json(cached);

        const sections = await contentRepository.getHomepageSections();
        await cacheService.set(CacheKeys.HOMEPAGE, sections, 300); // 5 minutes
        res.json(sections);
    });

    static uploadImage = catchAsync(async (req: Request, res: Response) => {
        if (!req.file) {
            throw new AppError("No file uploaded", 400);
        }
        const url = `/uploads/${req.file.filename}`;
        res.json({ url });
    });
}
