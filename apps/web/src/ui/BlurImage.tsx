"use client";

import { cn } from "@/lib/utils/utils";
import Image, { ImageProps } from "next/image";
import { memo, useEffect, useState, SyntheticEvent, useRef } from "react";

// Helps prevent flickering from re-rendering
export const BlurImage = memo((props: ImageProps) => {
  const [loading, setLoading] = useState(true);
  const [src, setSrc] = useState(props.src);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setSrc(props.src);
    setLoading(true);
  }, [props.src]);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoading(false);
    }
  }, [src]);

  const handleLoad = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setLoading(false);
    const target = e.target as HTMLImageElement;
    if (target.naturalWidth <= 16 && target.naturalHeight <= 16) {
      props.onError?.(e);
    }
  };

  return (
    <Image
      {...props}
      ref={imgRef}
      src={src}
      alt={props.alt || "Image"}
      className={cn(
        loading ? "blur-[2px]" : "blur-0", 
        "transition-[filter] duration-300 ease-in-out",
        props.className
      )}
      onLoad={handleLoad}
      onError={(e) => {
        props.onError?.(e);
      }}
      unoptimized={props.unoptimized}
    />
  );
});

BlurImage.displayName = "BlurImage";
