import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function InvoicePage() {
    const { id } = useParams();

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <div className="border rounded-lg p-8 bg-white text-black">
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-2xl font-bold">INVOICE</h1>
                        <p className="text-sm text-gray-500 mt-1">Invoice #INV-{id}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="font-bold">JOY</h2>
                        <p className="text-sm text-gray-500">Luxury Fashion</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div>
                        <h3 className="text-sm font-semibold mb-2">Billed To:</h3>
                        <div className="text-sm text-gray-600">
                            <p>Customer Name</p>
                            <p>Address Line 1</p>
                            <p>City, State, Zip</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="text-sm font-semibold mb-2">Details:</h3>
                        <div className="text-sm text-gray-600">
                            <p>Date: Jan 30, 2026</p>
                            <p>Status: Paid</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-b py-4 mb-8">
                    <p className="text-center text-gray-500">Invoice details generation coming soon...</p>
                </div>

                <div className="text-right">
                    <p className="text-lg font-bold">Total: ₹ 0.00</p>
                </div>
            </div>

            <div className="mt-8 flex justify-center">
                <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                </Button>
            </div>
        </div>
    );
}
