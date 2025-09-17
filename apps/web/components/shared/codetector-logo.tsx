import { cn } from "@/lib/utils";
import React from "react";

const CodetectorLogo = ({ className }: { className?: string }) => {
  return (
    <svg
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      viewBox="0 0 864 864"
      className={cn("fill-none stroke-primary stroke-[15] size-6", className)}>
      <g>
        <path
          className="st0"
          strokeMiterlimit={10}
          strokeWidth={40}
          d="M154.8,84.8c26.1,0,47.3,21.1,47.3,47.3s-21.1,47.3-47.3,47.3s-47.3-21.1-47.3-47.3S128.7,84.8,154.8,84.8
		 M154.8,36.7c-52.7,0-95.4,42.7-95.4,95.4s42.7,95.4,95.4,95.4s95.4-42.7,95.4-95.4S207.6,36.7,154.8,36.7L154.8,36.7z"
        />
      </g>
      <g>
        <path
          className="st0"
          strokeMiterlimit={10}
          strokeWidth={40}
          d="M173.5,684.7c26.1,0,47.3,21.1,47.3,47.3c0,26.1-21.1,47.3-47.3,47.3s-47.3-21.1-47.3-47.3
		C126.2,705.8,147.5,684.7,173.5,684.7 M173.5,636.6c-52.7,0-95.4,42.7-95.4,95.4s42.7,95.4,95.4,95.4s95.4-42.7,95.4-95.4
		S226.2,636.6,173.5,636.6L173.5,636.6z"
        />
      </g>
      <g>
        <path
          className="st0"
          strokeMiterlimit={10}
          strokeWidth={40}
          d="M709.2,514c26.1,0,47.3,21.1,47.3,47.3c0,26.1-21.1,47.3-47.3,47.3c-26.1,0-47.3-21.1-47.3-47.3
		C661.9,535.1,683,514,709.2,514 M709.2,466.1c-52.7,0-95.4,42.7-95.4,95.4s42.7,95.4,95.4,95.4c52.7,0,95.4-42.7,95.4-95.4
		C804.5,508.8,761.9,466.1,709.2,466.1L709.2,466.1z"
        />
      </g>
      <path
        className="st1"
        strokeMiterlimit={10}
        strokeWidth={40}
        strokeLinecap="round"
        d="M510.2,746.6V400.4c0-34.5-32-50-66.5-50H250.2c-55.8-0.2-95.8-0.8-95.4-89.5v-18.8"
      />
      <path
        className="st1"
        strokeMiterlimit={10}
        strokeWidth={40}
        strokeLinecap="round"
        d="M482,491H227.4c-29.9,4.2-54,28.2-54,58.1v66.5"
      />
      <line
        className="st1"
        strokeMiterlimit={10}
        strokeWidth={40}
        strokeLinecap="round"
        x1="516.5"
        y1="562.5"
        x2="595.8"
        y2="562.5"
      />
    </svg>
  );
};

export default CodetectorLogo;
