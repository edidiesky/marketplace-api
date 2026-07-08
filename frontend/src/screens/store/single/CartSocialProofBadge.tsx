import { useGetCartEngagementQuery } from "@/redux/services/cartApi";

interface CartSocialProofBadgeProps {
  productId: string;
}

export default function CartSocialProofBadge({
  productId,
}: CartSocialProofBadgeProps) {
  const { data, isLoading } = useGetCartEngagementQuery(productId, {
    skip: !productId,
  });

  const addsLast24h = data?.data?.addsLast24h ?? 0;

  if (isLoading || addsLast24h < 1) return null;

  return (
    <p className="text-sm bold text-red-600">
      Added to {addsLast24h} cart{addsLast24h === 1 ? "" : "s"} in the past 24
      hours
    </p>
  );
}