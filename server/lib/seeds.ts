import { productRepository } from "../repositories/productRepository";
import { userRepository } from "../repositories/userRepository";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { logger } from "../logger";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
    const existingProducts = await productRepository.findAll();
    if (existingProducts.total === 0) {
        logger.info("Seeding database...");

        // Categories
        const men = await productRepository.createCategory({ name: "Men", slug: "men", description: "Men's Fashion", imageUrl: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80" });
        const women = await productRepository.createCategory({ name: "Women", slug: "women", description: "Women's Fashion", imageUrl: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&q=80" });
        const accessories = await productRepository.createCategory({ name: "Accessories", slug: "accessories", description: "Bags & More", imageUrl: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&q=80" });

        // Products
        await productRepository.create({
            name: "Classic White Tee",
            description: "Premium cotton essential t-shirt.",
            mrp: "29.99",
            categoryId: men.id,
            stockQuantity: 100,
            images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80"],
            sizes: ["S", "M", "L", "XL"],
            colors: ["White", "Black"],
            tags: ["essential", "cotton"],
            isFeatured: true,
            showOnHomepage: true
        });

        await productRepository.create({
            name: "Leather Moto Jacket",
            description: "Genuine leather jacket with classic styling.",
            mrp: "199.99",
            categoryId: men.id,
            stockQuantity: 50,
            images: ["https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&q=80"],
            sizes: ["M", "L", "XL"],
            colors: ["Black"],
            isTrending: true,
            showOnHomepage: true
        });

        await productRepository.create({
            name: "Summer Floral Dress",
            description: "Lightweight and breezy dress for warm days.",
            mrp: "59.99",
            categoryId: women.id,
            stockQuantity: 75,
            images: ["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80"],
            sizes: ["XS", "S", "M", "L"],
            colors: ["Floral"],
            isNewArrival: true,
            showOnHomepage: true
        });

        await productRepository.create({
            name: "Leather Crossbody Bag",
            description: "Stylish and functional bag for everyday use.",
            mrp: "89.99",
            categoryId: accessories.id,
            stockQuantity: 30,
            images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80"],
            colors: ["Brown", "Black"],
            isBestSeller: true,
            showOnHomepage: true
        });

        // Admin User
        const hashedPassword = await hashPassword("admin123");
        await userRepository.create({
            email: "admin@example.com",
            password: hashedPassword,
            name: "Admin User",
            role: "admin"
        });

        logger.info("Database seeding complete.");
    }
}
