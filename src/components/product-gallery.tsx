"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Product image gallery.
 *
 * One of the few genuinely interactive pieces in the browse slice, so it is a
 * Client Component. Thumbnails are real buttons rather than divs, so the
 * gallery is keyboard-operable for free.
 */
export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 sm:flex-col" role="list">
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`relative block size-16 overflow-hidden rounded-md border-2 transition ${
                  index === activeIndex
                    ? "border-amber-accent"
                    : "border-transparent hover:border-ink-200"
                }`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative aspect-square flex-1 overflow-hidden rounded-card bg-surface">
        <Image
          src={active}
          alt={title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain"
        />
      </div>
    </div>
  );
}
