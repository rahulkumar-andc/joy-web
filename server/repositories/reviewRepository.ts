import { db } from "../db";
import { reviews, users, type Review, type InsertReview } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class ReviewRepository {
    async getProductReviews(productId: number): Promise<(Review & { user: { name: string } })[]> {
        const items = await db.select({
            review: reviews,
            userName: users.name
        })
            .from(reviews)
            .innerJoin(users, eq(reviews.userId, users.id))
            .where(eq(reviews.productId, productId))
            .orderBy(desc(reviews.createdAt));

        return items.map(i => ({ ...i.review, user: { name: i.userName } }));
    }

    async create(review: InsertReview): Promise<Review> {
        const [newReview] = await db.insert(reviews).values(review).returning();
        return newReview;
    }

    async getProductAverageRating(productId: number): Promise<number> {
        const productReviews = await db.select({ rating: reviews.rating })
            .from(reviews)
            .where(eq(reviews.productId, productId));

        if (productReviews.length === 0) return 0;
        const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
        return Math.round((sum / productReviews.length) * 10) / 10;
    }
}

export const reviewRepository = new ReviewRepository();
