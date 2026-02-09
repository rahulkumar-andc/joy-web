import { Request, Response } from "express";
import { db } from "../db";
import { cannedResponses } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

export class CannedResponseController {
    // GET /api/admin/canned-responses
    static getAll = catchAsync(async (req: Request, res: Response) => {
        const responses = await db.query.cannedResponses.findMany({
            orderBy: desc(cannedResponses.createdAt),
        });
        res.json({ success: true, data: responses });
    });

    // POST /api/admin/canned-responses
    static create = catchAsync(async (req: Request, res: Response) => {
        const { title, content } = req.body;
        const userId = (req as any).user.id;

        if (!title || !content) {
            throw new AppError("Title and content are required", 400);
        }

        const [response] = await db
            .insert(cannedResponses)
            .values({
                title,
                content,
                createdBy: userId,
            })
            .returning();

        res.status(201).json({ success: true, data: response });
    });

    // PUT /api/admin/canned-responses/:id
    static update = catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id);
        const { title, content } = req.body;

        const [existing] = await db
            .select()
            .from(cannedResponses)
            .where(eq(cannedResponses.id, id));

        if (!existing) {
            throw new AppError("Canned response not found", 404);
        }

        const [updated] = await db
            .update(cannedResponses)
            .set({
                title,
                content,
                updatedAt: new Date(),
            })
            .where(eq(cannedResponses.id, id))
            .returning();

        res.json({ success: true, data: updated });
    });

    // DELETE /api/admin/canned-responses/:id
    static delete = catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id);

        const [existing] = await db
            .select()
            .from(cannedResponses)
            .where(eq(cannedResponses.id, id));

        if (!existing) {
            throw new AppError("Canned response not found", 404);
        }

        await db.delete(cannedResponses).where(eq(cannedResponses.id, id));

        res.json({ success: true, message: "Canned response deleted successfully" });
    });
}
