import { db } from "../db";
import { homepageSections, homepageSectionItems, products, type HomepageSection, type Product } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class ContentRepository {
    async getHomepageSections(): Promise<(HomepageSection & { items: (Product & { order: number })[] })[]> {
        const sections = await db.select().from(homepageSections).where(eq(homepageSections.isActive, true)).orderBy(homepageSections.order);

        const result = [];
        for (const section of sections) {
            const items = await db.select({
                product: products,
                order: homepageSectionItems.order
            })
                .from(homepageSectionItems)
                .innerJoin(products, eq(homepageSectionItems.productId, products.id))
                .where(eq(homepageSectionItems.sectionId, section.id))
                .orderBy(homepageSectionItems.order);

            result.push({
                ...section,
                items: items.map(i => ({ ...i.product, order: i.order }))
            });
        }
        return result;
    }
}

export const contentRepository = new ContentRepository();
