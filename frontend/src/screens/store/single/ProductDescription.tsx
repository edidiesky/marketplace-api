import React from "react";

export default function ProductDescription() {
  return (
    <div className="w-full grid py-12 lg:py-28 lg:grid-cols-custom gap-12">
      <div className="w-full">
        {/* product description */}
        <div className="w-full flex flex-col gap-6">
          <h3 className="text-2xl">Description</h3>
          <h5 className="text-base space-y-2 font-k_font">
            <span className="block leading-loose">
              Vestibulum tellus justo, vulputate ac nunc eu, laoreet
              pellentesque erat. Nulla in fringilla ex. Nulla finibus rutrum
              lorem vehicula facilisis. Sed ornare congue mi, et volutpat diam.
              Suspendisse eget augue id magna placerat dignissim. Fusce at
              turpis neque. Nullam commodo consequat risus et iaculis. Aenean
              felis diam, venenatis et congue non, luctus sed velit. Curabitur
              vel metus a tellus luctus venenatis. Praesent ultricies non arcu
              non tincidunt.
            </span>
            <span className="block">Be the first to leave a review.</span>
          </h5>
        </div>
      </div>
      {/* product Additional Information */}

      <div className="lg:w-[450px] w-full flex flex-col gap-4">
        <div className="w-full flex flex-col gap-6">
          <h3 className="text-2xl">Additional Information</h3>
          <div className="w-full flex flex-col gap-1">
            <div className="w-full grid grid-cols-custom_2 gap-1">
              <div className="h-[70px] w-[150px] bg-[#F6F6F6] flex items-center justify-center text-base font-semibold font-work_font">
                Weight
              </div>
              <div className="w-full h-[70px] bg-[#F6F6F6] flex items-center justify-center text-base font-normal font-k_font">
                24 kg
              </div>
            </div>
            {/* dimensions */}
            <div className="w-full grid grid-cols-custom_2 gap-1">
              <div className="h-[70px] w-[150px] bg-[#F6F6F6] flex items-center justify-center text-base font-bold font-work_font">
                Dimensions
              </div>
              <div className="w-full h-[70px] bg-[#F6F6F6] flex items-center justify-center text-base font-normal font-k_font">
                12 × 48 × 62 cm
              </div>
            </div>
            {/* colors */}
            <div className="w-full grid grid-cols-custom_2 gap-1">
              <div className="h-[70px] w-[150px] bg-[#F6F6F6] flex items-center justify-center text-base font-bold font-work_font">
                Color
              </div>
              <div className="w-full h-[70px] bg-[#F6F6F6] flex items-center justify-center text-base font-normal font-k_font">
                Yellow, Orange, Red, Brown
              </div>
            </div>
            {/* sizes */}
            <div className="w-full grid grid-cols-custom_2 gap-1">
              <div className="h-[70px] w-[150px] bg-[#F6F6F6] flex items-center justify-center text-base font-bold font-work_font">
                Sizes
              </div>
              <div className="w-full h-[70px] bg-[#F6F6F6] flex items-center justify-center text-base font-normal font-k_font">
                S, M, L, XL
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
