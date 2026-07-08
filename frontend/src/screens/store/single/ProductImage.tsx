import LazyImage from "@/components/common/LazyImage";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function ProductImage({ images }: { images: string[] }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const prevImage = () =>
    setSelectedImage((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () =>
    setSelectedImage((i) => (i === images.length - 1 ? 0 : i + 1));

  console.log("images:", images);

  return (
    <div className="flex items-start gap-10">
      {images.length > 1 && (
        <div className="flex flex-col gap-2 shrink-0">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedImage(i)}
              className={`w-20 h-20 overflow-hidden border-2 rounded-2xl transition-colors bg-[#81807c86] shrink-0 ${
                selectedImage === i
                  ? "border-[#171717] border-4"
                  : "border-transparent hover:border-[#ccc]"
              }`}
            >
              <LazyImage src={img} alt="" />
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1 rounded-2xl aspect-square overflow-hidden bg-[#f0efec]">
        <LazyImage src={images[selectedImage] ?? ""} alt="store images" />

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute rounded-full left-3 top-1/2 -translate-y-1/2 w-12 shadow-3xl h-12 bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} className="text-[#333]" />
            </button>
            <button
              onClick={nextImage}
              className="absolute rounded-full right-3 top-1/2 -translate-y-1/2 w-12 shadow-3xl h-12 bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={24} className="text-[#333]" />
            </button>

            {/* dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    selectedImage === i ? "bg-[#171717]" : "bg-[#171717]/30"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
