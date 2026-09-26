"use client";

import { cn } from "@/ui/cn";
import Image, { ImageProps } from "next/image";
import { memo, useEffect, useState, SyntheticEvent, useRef, ReactNode } from "react";

interface BlurImageProps extends Omit<ImageProps, 'key' | 'placeholder'> {
  /**
   * Rendered behind the image and faded out once the real image has decoded.
   * Use it for a blurred low-res preview so a slow network never shows a blank
   * tile. The parent element must be positioned (relative).
   */
  blurPlaceholder?: ReactNode;
}

// Helps prevent flickering from re-rendering
export const BlurImage = memo(({ blurPlaceholder, ...props }: BlurImageProps) => {
  const [loading, setLoading] = useState(true);
  const [src, setSrc] = useState(props.src);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setSrc(props.src);
    setLoading(true);
  }, [props.src]);

  useEffect(() => {
    // Cached images resolve before React attaches an onLoad handler, so check
    // the DOM directly or the placeholder would stay up forever.
    if (imgRef.current?.complete) {
      setLoading(false);
    }
  }, [src]);

  const handleLoad = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setLoading(false);
    const target = e.target as HTMLImageElement;
    // A 16px-or-smaller natural size means the provider handed back its default
    // globe/arrow placeholder rather than a real logo — treat it as a failure.
    // Must `return` so callers never cache the placeholder as a success.
    if (target.naturalWidth <= 16 && target.naturalHeight <= 16) {
      props.onError?.(e);
      return;
    }
    props.onLoad?.(e);
  };

  return (
    <>
      {blurPlaceholder ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-out",
            loading ? "opacity-100" : "opacity-0"
          )}
        >
          {blurPlaceholder}
        </span>
      ) : null}
      <Image
        {...props}
        ref={imgRef}
        src={src}
        alt={props.alt || "Image"}
        className={cn(
          "transition-[filter] duration-300 ease-in-out",
          loading ? "blur-[2px]" : "blur-none",
          blurPlaceholder ? "relative" : null,
          props.className
        )}
        onLoad={handleLoad}
        onError={(e) => {
          props.onError?.(e);
        }}
        unoptimized={props.unoptimized}
      />
    </>
  );
});

BlurImage.displayName = "BlurImage";
