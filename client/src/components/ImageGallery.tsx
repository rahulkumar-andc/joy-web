import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
    images: string[];
    productName: string;
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
    const [selectedImage, setSelectedImage] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Fallback if no images
    const safeImages = images.length > 0 ? images : ["https://placehold.co/600x800?text=No+Image"];

    // Handle Thumbnail hover/click
    const handleThumbnailEnter = (index: number) => {
        setSelectedImage(index);
    };

    return (
        <div className="flex flex-col-reverse lg:flex-row gap-4 sticky top-24 h-fit z-10 pointer-events-auto">
            {/* Thumbnails Sidebar - Desktop: Left vertical, Mobile: Bottom horizontal */}
            <div className="flex lg:flex-col gap-2 overflow-auto hide-scrollbar lg:w-[64px] flex-shrink-0">
                {safeImages.map((img, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "w-[64px] h-[64px] border rounded-[2px] cursor-pointer p-1 transition-all duration-200 flex-shrink-0",
                            selectedImage === idx
                                ? "border-flipkart-blue shadow-sm ring-1 ring-flipkart-blue/20"
                                : "border-gray-200 hover:border-flipkart-blue/50"
                        )}
                        onMouseEnter={() => handleThumbnailEnter(idx)}
                        onClick={() => handleThumbnailEnter(idx)}
                    >
                        <img
                            src={img}
                            alt={`${productName} view ${idx + 1}`}
                            className="w-full h-full object-contain"
                        />
                    </div>
                ))}
            </div>

            {/* Main Image Display */}
            <div
                className="flex-1 border bg-white relative flex items-center justify-center min-h-[450px] lg:h-[550px]"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="relative w-full h-full p-4">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={selectedImage}
                            src={safeImages[selectedImage]}
                            alt={productName}
                            initial={{ opacity: 0.8 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full object-contain mx-auto"
                        />
                    </AnimatePresence>

                    {/* Wishlist Button - Top Right Absolute */}
                    {/* Note: In Flipkart, the wishlist heart is usually on the top right of the image container */}
                </div>
            </div>
        </div>
    );
}
