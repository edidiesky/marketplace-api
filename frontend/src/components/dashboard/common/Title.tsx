export default function Title({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h4 className="text-xl lg:text-2xl bold text-[#17191c]">
        {title}
      </h4>
      <p className="text-base text-[#64645f] mt-1 max-w-[520px] leading-[1.6]">
        {description}
      </p>
    </div>
  );
}
