import type { SVGProps } from "react";

export function OptiPicLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2z" />
      <path d="M3.5 3.5L4 4" />
      <path d="M20 20L20.5 20.5" />
      <path d="M3.5 20.5L4 20" />
      <path d="M20.5 3.5L20 4" />
    </svg>
  );
}
