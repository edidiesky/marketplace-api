import React from "react";

export default function ProductReview() {
  return (
    <div className="w-full grid py-12 gap-12">
      <div className="w-full">
        {/* product description */}
        <div className="w-full flex flex-col gap-6">
          <h3 className="text-2xl">Customer Reviews (0)</h3>
          <h5 className="text-base space-y-2 font-k_font">
            <span className="block leading-loose">
              Vestibulum tellus justo, vulputate ac nunc eu, laoreet
              pellentesque erat. Nulla in fringilla ex. Nulla finibus rutrum
            </span>
            <span className="block">Be the first to leave a review.</span>
          </h5>
        </div>
      </div>
    </div>
  );
}
