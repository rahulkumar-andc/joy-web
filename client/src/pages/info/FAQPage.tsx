import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQPage() {
    const faqs = [
        {
            q: "How do I track my order?",
            a: "Once your order is shipped, you will receive an email with a tracking number. You can also view status in 'My Orders'."
        },
        {
            q: "What is your return policy?",
            a: "We offer a 30-day return policy for unworn items in original packaging. shipping costs for returns are free."
        },
        {
            q: "Do you ship internationally?",
            a: "Currently we only ship within India. We plan to expand globally soon."
        },
        {
            q: "How can I find my size?",
            a: "Please refer to our Size Guide available on every product page and in the footer."
        }
    ];

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl">
                <h1 className="text-4xl font-display font-bold text-primary mb-8 text-center">Freqently Asked Questions</h1>

                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i}`}>
                            <AccordionTrigger className="text-lg font-medium">{faq.q}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                {faq.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </main>
            <Footer />
        </div>
    );
}
