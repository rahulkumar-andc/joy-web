import { db } from "../db";
import { reviews, reviewVotes, users, type Review, type InsertReview } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

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

    async getRatingDistribution(productId: number): Promise<{
        avgRating: number;
        totalRatings: number;
        distribution: { [key: number]: number };
    }> {
        const productReviews = await db.select({ rating: reviews.rating })
            .from(reviews)
            .where(eq(reviews.productId, productId));

        const distribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        if (productReviews.length === 0) {
            return { avgRating: 0, totalRatings: 0, distribution };
        }

        let sum = 0;
        for (const review of productReviews) {
            sum += review.rating;
            if (review.rating >= 1 && review.rating <= 5) {
                distribution[review.rating]++;
            }
        }

        return {
            avgRating: Math.round((sum / productReviews.length) * 10) / 10,
            totalRatings: productReviews.length,
            distribution
        };
    }

    async getById(reviewId: number): Promise<Review | undefined> {
        const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId));
        return review;
    }

    async voteHelpful(reviewId: number, userId: number): Promise<{ success: boolean; helpfulCount: number }> {
        try {
            // Try to insert vote (will fail if already exists due to unique constraint)
            await db.insert(reviewVotes).values({ reviewId, userId });

            // Increment helpful count
            const [updated] = await db.update(reviews)
                .set({ helpfulCount: sql`${reviews.helpfulCount} + 1` })
                .where(eq(reviews.id, reviewId))
                .returning({ helpfulCount: reviews.helpfulCount });

            return { success: true, helpfulCount: updated?.helpfulCount || 0 };
        } catch (error: any) {
            // Unique constraint violation - user already voted
            if (error.code === '23505') {
                const review = await this.getById(reviewId);
                return { success: false, helpfulCount: review?.helpfulCount || 0 };
            }
            throw error;
        }
    }

    async hasUserVoted(reviewId: number, userId: number): Promise<boolean> {
        const result = await db.select({ id: reviewVotes.id })
            .from(reviewVotes)
            .where(and(eq(reviewVotes.reviewId, reviewId), eq(reviewVotes.userId, userId)))
            .limit(1);
        return result.length > 0;
    }
}

export const reviewRepository = new ReviewRepository();
