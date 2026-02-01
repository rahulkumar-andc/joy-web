import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl prose prose-slate">
                <h1 className="font-display text-4xl font-bold text-primary mb-8">Privacy Policy</h1>

                <h3>1. Information We Collect</h3>
                <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us.</p>

                <h3>2. How We Use Your Information</h3>
                <p>We use the information we collect to provide, maintain, and improve our services, process transactions, and send you related information.</p>

                <h3>3. Data Security</h3>
                <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access.</p>

                <p className="text-sm text-muted-foreground mt-8">Last Updated: January 2026</p>
            </main>
            <Footer />
        </div>
    );
}
