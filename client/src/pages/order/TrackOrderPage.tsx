import { useParams } from "wouter";

export default function TrackOrderPage() {
    const { id } = useParams();

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-3xl font-bold mb-8">Track Order #{id}</h1>

            <div className="border rounded-lg p-8">
                <div className="relative">
                    {/* Vertical line connecting steps */}
                    <div className="absolute left-4 top-0 h-full w-0.5 bg-muted -z-10"></div>

                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold z-10">✓</div>
                            <div>
                                <h3 className="font-semibold">Order Placed</h3>
                                <p className="text-sm text-muted-foreground">Jan 30, 2026 - 10:30 AM</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold z-10">✓</div>
                            <div>
                                <h3 className="font-semibold">Processing</h3>
                                <p className="text-sm text-muted-foreground">Jan 30, 2026 - 2:00 PM</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold z-10">3</div>
                            <div>
                                <h3 className="font-semibold text-muted-foreground">shipped</h3>
                                <p className="text-sm text-muted-foreground">Expected: Feb 1, 2026</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold z-10">4</div>
                            <div>
                                <h3 className="font-semibold text-muted-foreground">Delivered</h3>
                                <p className="text-sm text-muted-foreground">Expected: Feb 3, 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
