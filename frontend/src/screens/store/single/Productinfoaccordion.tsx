import {
  Calendar,
  Undo2,
  Truck,
  MapPin,
  Pencil,
  Sparkles,
} from "lucide-react";

import Accordion, { AccordionItemData } from "./Accordion";

export interface ShippingInfo {
  processingTime: string; 
  returnsAccepted: boolean;
  shippingCost: string; 
  shipsFrom: string; 
  deliverTo: string;
}

export interface SellerSummary {
  id: string;
  name: string;
  avatarUrl?: string;
  isStarSeller?: boolean;
  blurb?: string;
}

interface ProductInfoAccordionProps {
  itemDetails: string[];
  shippingInfo?: ShippingInfo;
  didYouKnow?: string[];
  sellers?: SellerSummary[];
  isStarSeller?: boolean;
  onEditDeliveryLocation?: () => void;
  defaultOpenId?: string;
}


export default function ProductInfoAccordion({
  itemDetails,
  shippingInfo,
  didYouKnow = [],
  sellers,
  isStarSeller = false,
  onEditDeliveryLocation,
  defaultOpenId,
}: ProductInfoAccordionProps) {

  const items: AccordionItemData[] = [
    {
      id: "item-details",
      title: "Item details",
      content: <ItemDetailsContent details={itemDetails} />,
    },
    ...(shippingInfo
      ? [
          {
            id: "shipping",
            title: "Shipping and return policies",
            content: (
              <ShippingContent
                info={shippingInfo}
                onEditDeliveryLocation={onEditDeliveryLocation}
              />
            ),
          },
        ]
      : []),
    ...(didYouKnow.length > 0
      ? [
          {
            id: "did-you-know",
            title: "Did you know?",
            content: <DidYouKnowContent facts={didYouKnow} />,
          },
        ]
      : []),
    ...(sellers && sellers.length > 0
      ? [
          {
            id: "sellers",
            title: "Meet your sellers",
            content: <SellersContent sellers={sellers} />,
          },
        ]
      : []),
  ];


  return (
    <div className="w-full flex flex-col gap-6">
      {isStarSeller && (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f3ee]">
            <Sparkles size={16} className="text-purple-600" />
          </span>
          <p className="text-sm text-[#444] leading-relaxed">
            <span className="bold text-[#171717]">Star Seller. </span>
            This seller consistently earned 5-star reviews, shipped on time,
            and replied quickly to any messages they received.
          </p>
        </div>
      )}

      <Accordion items={items} defaultOpenId={defaultOpenId} />
    </div>
  );
}

function ItemDetailsContent({ details }: { details: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {details.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

function ShippingContent({
  info,
  onEditDeliveryLocation,
}: {
  info: ShippingInfo;
  onEditDeliveryLocation?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 items-start">
      <div className="flex items-center gap-3">
        <Calendar size={18} className="text-[#666] shrink-0" />
        <span>Ships out within {info.processingTime}</span>
      </div>
      <div className="flex items-center gap-3">
        <Undo2 size={18} className="text-[#666] shrink-0" />
        <span className="underline underline-offset-4 decoration-dashed">
          {info.returnsAccepted
            ? "Returns & exchanges accepted"
            : "Returns & exchanges not accepted"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Truck size={18} className="text-[#666] shrink-0" />
        <span>
          Cost to ship: <span className="bold">{info.shippingCost}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <MapPin size={18} className="text-[#666] shrink-0" />
        <span>
          Ships from: <span className="bold">{info.shipsFrom}</span>
        </span>
      </div>
      <div className="flex flex-1 rounded-full items-center gap-2 text-[#171717] py-3 px-4 cursor-pointer hover:bg-[#e8e6e3]">
        <span className="bold">Deliver to {info.deliverTo}</span>
        <button
          onClick={onEditDeliveryLocation}
          aria-label="Edit delivery location"
          className="text-[#666] hover:text-[#171717] transition-colors"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

function DidYouKnowContent({ facts }: { facts: string[] }) {
  return (
    <ul className="flex flex-col gap-2 list-disc pl-4">
      {facts.map((fact, i) => (
        <li key={i}>{fact}</li>
      ))}
    </ul>
  );
}

function SellersContent({ sellers }: { sellers: SellerSummary[] }) {
  return (
    <div className="flex flex-col gap-4">
      {sellers.map((seller) => (
        <div key={seller.id} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f4f3ee] overflow-hidden shrink-0">
            {seller.avatarUrl && (
              <img
                src={seller.avatarUrl}
                alt={seller.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className="bold text-[#171717]">{seller.name}</span>
            {seller.blurb && (
              <span className="text-[#666]">{seller.blurb}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}