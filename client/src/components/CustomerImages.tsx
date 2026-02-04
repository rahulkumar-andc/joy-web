import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CustomerImagesProps {
    images: string[];
    className?: string;
}

// Mock customer images - in real app would come from reviews
const mockCustomerImages = [
    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1564557287817-3785e38ec1f5?w=200&h=200&fit=crop",
];

export function CustomerImages({ images, className }: CustomerImagesProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Use mock images if none provided
    const displayImages = images?.length > 0 ? images : mockCustomerImages;

    const openLightbox = (index: number) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const goToPrev = () => {
        setCurrentIndex(prev => (prev === 0 ? displayImages.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex(prev => (prev === displayImages.length - 1 ? 0 : prev + 1));
    };

    if (displayImages.length === 0) return null;

    return (
        <>
            <div className={cn("mt-6", className)}>
                <div className="flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4 text-gray-500" />
                    <h4 className="text-[14px] font-medium text-gray-700">
                        Images uploaded by customers ({displayImages.length})
                    </h4>
                </div>

                {/* Horizontal Scrollable Gallery */}
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {displayImages.map((img, idx) => (
                        <div
                            key={idx}
                            onClick={() => openLightbox(idx)}
                            className="w-[80px] h-[80px] flex-shrink-0 rounded-sm overflow-hidden cursor-pointer border hover:border-flipkart-blue transition-colors"
                        >
                            <img
                                src={img}
                                alt={`Customer photo ${idx + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {lightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                        onClick={closeLightbox}
                    >
                        {/* Close Button */}
                        <button
                            onClick={closeLightbox}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        {/* Navigation */}
                        <button
                            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                            className="absolute left-4 text-white hover:text-gray-300 p-2"
                        >
                            <ChevronLeft className="w-10 h-10" />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); goToNext(); }}
                            className="absolute right-4 text-white hover:text-gray-300 p-2"
                        >
                            <ChevronRight className="w-10 h-10" />
                        </button>

                        {/* Main Image */}
                        <motion.img
                            key={currentIndex}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            src={displayImages[currentIndex]}
                            alt={`Customer photo ${currentIndex + 1}`}
                            className="max-w-[90vw] max-h-[85vh] object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Counter */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                            {currentIndex + 1} / {displayImages.length}
                        </div>

                        {/* Thumbnail Strip */}
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto hide-scrollbar">
                            {displayImages.map((img, idx) => (
                                <div
                                    key={idx}
                                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                                    className={cn(
                                        "w-12 h-12 flex-shrink-0 rounded cursor-pointer border-2 transition-all overflow-hidden",
                                        idx === currentIndex ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
