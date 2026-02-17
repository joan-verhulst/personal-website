"use client";

import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { siteData } from "~/data/site";
import cn from "~/utils/cn";
import { navigateWithTransition } from "~/utils/page-transition";

interface Props {
  showBackButton?: boolean;
  className?: string;
}

const Header = ({ showBackButton = false, className }: Props) => {
  const router = useRouter();
  const buttonWrapperRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  const handleBack = () => {
    if (!buttonWrapperRef.current || !backButtonRef.current) {
      navigateWithTransition("/", router, "outward");
      return;
    }

    // Exit animation: fade out button, then collapse wrapper
    const tl = gsap.timeline({
      onComplete: () => navigateWithTransition("/", router, "outward"),
    });

    // Fade and scale out the button
    tl.to(backButtonRef.current, {
      opacity: 0,
      scale: 0.5,
      duration: 0.15,
      ease: "power2.in",
    });

    // Collapse wrapper width and margin (text returns to center)
    tl.to(
      buttonWrapperRef.current,
      { width: 0, marginLeft: 0, duration: 0.25, ease: "power2.inOut" },
      "-=0.05",
    );
  };

  // Animate back button in: first expand width, then fade in icon
  useEffect(() => {
    if (!showBackButton || !buttonWrapperRef.current || !backButtonRef.current)
      return;

    const tl = gsap.timeline({ delay: 0.5 });

    // Expand wrapper width and margin (pushes text)
    tl.fromTo(
      buttonWrapperRef.current,
      { width: 0, marginLeft: 0 },
      { width: "auto", marginLeft: 16, duration: 0.3, ease: "power2.out" },
    );

    // Fade and scale in the button icon
    tl.fromTo(
      backButtonRef.current,
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 0.2, ease: "back.out(2)" },
      "-=0.1",
    );
  }, [showBackButton]);

  return (
    <div
      className={cn(
        "w-full flex absolute justify-center pt-12 pb-12 z-50",
        className,
      )}
    >
      <div className="flex items-center">
        <h1 className="text-neutral-950 font-regular text-lg">
          {siteData.owner.name}
        </h1>
        {showBackButton && (
          <div
            ref={buttonWrapperRef}
            className="overflow-hidden"
            style={{ width: 0, marginLeft: 0 }}
          >
            <button
              ref={backButtonRef}
              onClick={handleBack}
              className="p-2 rounded-full border border-neutral-950/10 text-neutral-950 hover:text-neutral-600 transition-colors cursor-pointer opacity-0"
              aria-label="Go back"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
