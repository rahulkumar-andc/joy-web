import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl prose prose-slate">
                <h1 className="font-display text-4xl font-bold text-primary mb-8">Terms of Service</h1>

                <h3>1. Acceptance of Terms</h3>
                <p>By accessing or using our website, you agree to be bound by these Terms of Service.</p>

                <h3>2. Use of Services</h3>
                <p>You may use our services for lawful purposes only. You agree not to violate any laws in your jurisdiction.</p>

                <h3>3. Purchases</h3>
                <p>All purchases made through our site are subject to our acceptance. We reserve the right to refuse or cancel any order.</p>

                <p className="text-sm text-muted-foreground mt-8">Last Updated: January 2026</p>
            </main>
            <Footer />
        </div>
    );
}
