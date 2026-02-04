import { Tag } from "lucide-react";
import { useState } from "react";

export function AvailableOffers() {
    const [showAll, setShowAll] = useState(false);

    // Bank and partner offers
    const offers = [
        {
            id: 1,
            title: "Bank Offer",
            description: "5% Unlimited Cashback on Axis Bank Credit Card",
            linkText: "T&C"
        },
        {
            id: 2,
            title: "Bank Offer",
            description: "10% off up to ₹1,500 on HDFC Bank Credit Card Transactions",
            linkText: "T&C"
        },
        {
            id: 3,
            title: "Bank Offer",
            description: "10% off up to ₹1,750 on HDFC Bank Credit Card EMI Transactions",
            linkText: "T&C"
        },
        {
            id: 4,
            title: "Special Price",
            description: "Get extra 20% off (price inclusive of cashback/coupon)",
            linkText: "T&C"
        },
        {
            id: 5,
            title: "Partner Offer",
            description: "Sign up for Pay Later and get Gift Card worth up to ₹500*",
            linkText: "Know More"
        }
    ];

    const visibleOffers = showAll ? offers : offers.slice(0, 4);

    return (
        <div className="mt-4 mb-6">
            <h3 className="font-medium text-16 text-gray-900 mb-2">Available offers</h3>
            <div className="space-y-2">
                {visibleOffers.map((offer) => (
                    <div key={offer.id} className="flex items-start gap-2">
                        <Tag className="w-4 h-4 text-green-600 fill-green-600 mt-[3px] flex-shrink-0" />
                        <div className="text-[14px]">
                            <span className="font-medium text-gray-800">{offer.title}</span>
                            <span className="text-gray-700 mx-1">{offer.description}</span>
                            <button className="text-flipkart-blue font-medium hover:underline text-[13px]">
                                {offer.linkText}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {offers.length > 4 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-flipkart-blue font-medium text-[14px] mt-2 hover:underline font-medium"
                >
                    {showAll ? "View Less" : "View Option Offers"}
                </button>
            )}
        </div>
    );
}
