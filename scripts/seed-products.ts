import "dotenv/config";
import { productRepository } from "../server/repositories/productRepository";
import { db } from "../server/db";
import { categories } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedProducts() {
    console.log("Seeding products...");

    // Check/Create Categories
    let men = await db.query.categories.findFirst({ where: eq(categories.slug, "men") });
    if (!men) {
        men = await productRepository.createCategory({ name: "Men", slug: "men", description: "Men's Fashion", imageUrl: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80" });
    }

    let women = await db.query.categories.findFirst({ where: eq(categories.slug, "women") });
    if (!women) {
        women = await productRepository.createCategory({ name: "Women", slug: "women", description: "Women's Fashion", imageUrl: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&q=80" });
    }

    // Create a product
    const product = await productRepository.create({
        name: "Test Classic Tee",
        description: "Premium cotton essential t-shirt for testing.",
        price: "29.99",
        categoryId: men.id,
        stockQuantity: 100,
        images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80"],
        sizes: ["M", "L"],
        colors: ["White"],
        tags: ["test", "essential"],
        isFeatured: true,
        showOnHomepage: true
    });

    console.log(`✅ Created Product: ${product.name} (ID: ${product.id})`);
    process.exit(0);
}

seedProducts().catch(console.error);
