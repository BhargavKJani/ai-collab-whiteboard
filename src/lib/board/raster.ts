"use client";

import { elementsToSvg } from "./export";
import type { BoardElement } from "./types";

/** Rasterise elements to a PNG data URL via an offscreen canvas. */
export async function elementsToPng(
  elements: BoardElement[],
  opts: { scale?: number; maxSize?: number; background?: string } = {},
): Promise<string> {
  const { svg, width, height } = elementsToSvg(elements, { background: opts.background ?? "#070a16" });
  let scale = opts.scale ?? 2;
  if (opts.maxSize) scale = Math.min(scale, opts.maxSize / Math.max(width, height));
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render board"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function download(filename: string, href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
