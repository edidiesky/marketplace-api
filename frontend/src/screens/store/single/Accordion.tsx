import { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItemData {
  id: string;
  title: string;
  content: ReactNode;
  icon?: ReactNode;
}

interface AccordionProps {
  items: AccordionItemData[];
  defaultOpenId?: string;
  allowMultiple?: boolean;
  className?: string;
}


export default function Accordion({
  items,
  defaultOpenId,
  allowMultiple = false,
  className = "",
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    new Set(defaultOpenId ? [defaultOpenId] : []),
  );

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const isOpen = prev.has(id);
      if (allowMultiple) {
        const next = new Set(prev);
        if (isOpen) next.delete(id);
        else next.add(id);
        return next;
      }
      return isOpen ? new Set<string>() : new Set([id]);
    });
  };

  return (
    <div
      className={`flex flex-col  ${className}`}
    >
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        const panelId = `accordion-panel-${item.id}`;
        const buttonId = `accordion-button-${item.id}`;

        return (
          <div key={item.id} className="flex flex-col gap-4">
            <button
              id={buttonId}
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="w-full flex hover:bg-[#33140008] items-center justify-between gap-4 p-4 rounded-full text-left text-base lg:text-lg bold text-[#171717] hover:text-black h-14 transition-colors"
            >
              <span className="flex items-center gap-2">
                {item.icon}
                {item.title}
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-300 px-6 ease-in-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pb-5 text-base text-[#444] leading-relaxed">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}