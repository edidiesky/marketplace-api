import { useEffect, useRef, useState } from "react";
import { useTrackProductViewMutation } from "@/redux/services/productApi";

interface UrgencyBannerProps {
  productId: string;
}

export default function UrgencyBanner({ productId }: UrgencyBannerProps) {
  const [trackView] = useTrackProductViewMutation();
  const [viewCount, setViewCount] = useState<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || !productId) return;
    firedRef.current = true;

    trackView(productId)
      .unwrap()
      .then((res) => setViewCount(res.data.viewCount))
      .catch(() => setViewCount(null));
  }, [productId, trackView]);

  if (!viewCount || viewCount < 1) return null;

  return (
    <h4 className="text-lg bold text-red-600">
      {viewCount}+ view{viewCount === 1 ? "" : "s"} in 24 hours
    </h4>
  );
}