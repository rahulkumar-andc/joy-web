export default function AboutPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-4xl font-bold mb-8 text-center">About JOY</h1>

            <div className="prose prose-lg mx-auto">
                <p className="lead text-xl text-center text-muted-foreground mb-12">
                    We are redefining luxury fashion for the modern era.
                </p>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
                    <p>
                        Founded in 2026, JOY began with a simple mission: to make premium fashion accessible without compromising on quality or experience. We believe that style is a form of self-expression that should be available to everyone.
                    </p>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
                    <ul className="space-y-4">
                        <li className="flex items-start">
                            <span className="font-bold mr-2">Quality:</span>
                            <span>We source only the finest materials for our collections.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold mr-2">Sustainability:</span>
                            <span>We are committed to ethical manufacturing and reducing our environmental footprint.</span>
                        </li>
                        <li className="flex items-start">
                            <span className="font-bold mr-2">Customer First:</span>
                            <span>Your satisfaction is at the heart of everything we do.</span>
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
