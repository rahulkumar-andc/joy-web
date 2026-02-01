import { useLocation } from "wouter";

export default function SearchPage() {
    const [location] = useLocation();
    const searchParams = new URLSearchParams(window.location.search);
    const query = searchParams.get("q");

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Search Results</h1>

            {query ? (
                <p className="text-muted-foreground mb-8">Showing results for "{query}"</p>
            ) : (
                <p className="text-muted-foreground mb-8">Enter a search term to find products.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <aside className="hidden md:block">
                    <div className="bg-muted/30 p-4 rounded-lg">
                        <h3 className="font-semibold mb-4">Filters</h3>
                        <p className="text-sm text-muted-foreground">Filters coming soon...</p>
                    </div>
                </aside>
                <div className="md:col-span-3">
                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                        <h2 className="text-xl font-medium">No products found</h2>
                        <p className="text-muted-foreground mt-2">Try adjusting your search or filters.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
