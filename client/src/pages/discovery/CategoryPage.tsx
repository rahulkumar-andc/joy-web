import { useParams } from "wouter";

export default function CategoryPage() {
    const { slug } = useParams();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 capitalize">{slug?.replace("-", " ")}</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <aside className="hidden md:block">
                    {/* Filters will go here */}
                    <div className="bg-muted/30 p-4 rounded-lg">
                        <h3 className="font-semibold mb-4">Filters</h3>
                        <p className="text-sm text-muted-foreground">Filters coming soon...</p>
                    </div>
                </aside>
                <div className="md:col-span-3">
                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                        <h2 className="text-xl font-medium">Products in {slug}</h2>
                        <p className="text-muted-foreground mt-2">Displaying products for category: {slug}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
