"use client";

import { memo } from "react";
import { arrowHead, diamondPoints, penPath, wrapText } from "@/lib/board/render";
import type { BoardElement } from "@/lib/board/types";

function Label({ el, color, centered, pad = 10 }: { el: BoardElement; color: string; centered: boolean; pad?: number }) {
  if (!el.text) return null;
  const fs = el.fontSize ?? 16;
  const lines = wrapText(el.text, Math.max(10, el.w - pad * 2), fs);
  const lh = fs * 1.25;
  const startY = centered ? el.h / 2 - (lines.length * lh) / 2 + fs * 0.9 : pad + fs * 0.9;
  const x = centered ? el.w / 2 : pad;
  return (
    <text
      fontSize={fs}
      fill={color}
      textAnchor={centered ? "middle" : "start"}
      style={{ fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui", userSelect: "none" }}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={x} y={startY + i * lh}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function ElementViewInner({ el, hideText }: { el: BoardElement; hideText?: boolean }) {
  const common = { stroke: el.stroke, strokeWidth: el.strokeWidth, fill: el.fill ?? "transparent" };
  const label = hideText ? null : <Label el={el} color={el.stroke} centered />;
  let body: React.ReactNode = null;
  switch (el.type) {
    case "pen":
      body = <path d={penPath(el)} fill={el.stroke} />;
      break;
    case "rect":
      body = (
        <>
          <rect width={el.w} height={el.h} rx={10} {...common} />
          {label}
        </>
      );
      break;
    case "ellipse":
      body = (
        <>
          <ellipse cx={el.w / 2} cy={el.h / 2} rx={el.w / 2} ry={el.h / 2} {...common} />
          {label}
        </>
      );
      break;
    case "diamond":
      body = (
        <>
          <polygon points={diamondPoints(el)} strokeLinejoin="round" {...common} />
          {label}
        </>
      );
      break;
    case "line":
    case "arrow": {
      const pts = el.points ?? [];
      const head = el.type === "arrow" ? arrowHead(pts) : null;
      body = (
        <>
          {/* wide invisible stroke for easier hovering */}
          <polyline points={pts.map((p) => p.join(",")).join(" ")} stroke="transparent" strokeWidth={14} fill="none" />
          <polyline
            points={pts.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {head && (
            <polyline
              points={head.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke={el.stroke}
              strokeWidth={el.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </>
      );
      break;
    }
    case "sticky":
      body = (
        <>
          <rect width={el.w} height={el.h} rx={6} fill={el.fill ?? "#fde68a"} filter="url(#sticky-shadow)" />
          {!hideText && <Label el={el} color="#0f172a" centered={false} pad={14} />}
        </>
      );
      break;
    case "text":
      body = hideText ? null : <Label el={{ ...el, w: 4000 }} color={el.stroke} centered={false} pad={2} />;
      break;
  }
  return (
    <g
      transform={`translate(${el.x} ${el.y})`}
      data-testid={`el-${el.type}`}
      data-id={el.id}
      className="wb-el"
    >
      {body}
    </g>
  );
}

export const ElementView = memo(ElementViewInner);
