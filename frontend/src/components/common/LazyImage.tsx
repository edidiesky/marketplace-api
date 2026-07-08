import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

interface Props {
  src:       string;
  alt?:      string;
  className?: string;
}

export default function LazyImage({ src, alt = "", className = "" }: Props) {
  return (
    <LazyLoadImage
      src={src}
      alt={alt}
      effect="blur"
      wrapperProps={{
        style: {
          display:         "block",
          height:          "100%",
          width:           "100%",
          transitionDelay: "0.5s",
        },
      }}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      className={className}
    />
  );
}