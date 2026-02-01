export default function ReturnPolicyPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-3xl font-bold mb-8">Return & Refund Policy</h1>

            <div className="prose max-w-none space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Return Window</h2>
                    <p>
                        You have <strong>30 days</strong> from the date of delivery to return any item. Items must be unused, in their original packaging, and with all tags attached.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. How to Initiate a Return</h2>
                    <p>
                        To start a return, please visit your Orders page and select the "Return/Replace" option next to the item you wish to return. You will be guided through the process.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. Refunds</h2>
                    <p>
                        Once we receive your return, we will inspect the item. If approved, your refund will be processed to your original payment method within 5-7 business days.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Exchanges</h2>
                    <p>
                        If you received a defective or incorrect item, we will replace it free of charge. Please select the "Replace" option during the return process.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Exceptions</h2>
                    <p>
                        Certain items such as personalized products, underwear, and swimwear are non-returnable for hygiene and customization reasons.
                    </p>
                </section>
            </div>
        </div>
    );
}
