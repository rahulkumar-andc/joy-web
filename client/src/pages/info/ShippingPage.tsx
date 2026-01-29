import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function ShippingPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl prose prose-slate">
                <h1 className="font-display text-4xl font-bold text-primary mb-8">Shipping & Returns</h1>

                <h3>Shipping Policy</h3>
                <p>We offer free shipping on all orders over ₹2000. Standard shipping takes 3-5 business days. Express shipping is available at checkout.</p>

                <h3>Return Policy</h3>
                <p>We accept returns within 30 days of delivery. Items must be unworn, unwashed, and with original tags attached.</p>

                <h3>Refunds</h3>
                <p>Once we inspect your return, we will notify you and process your refund to the original payment method within 5-7 business days.</p>
            </main>
            <Footer />
        </div>
    );
}
