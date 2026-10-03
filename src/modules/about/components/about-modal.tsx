"use client";

import { gsap } from "gsap";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef } from "react";
import { useContent } from "~/modules/content/components/content-provider";
import Modal from "~/modules/core/components/modal";
import AnimatedText, {
  type AnimatedTextHandle,
} from "~/modules/core/components/utils/AnimatedText";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { siteData } from "~/data/site";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal = ({ isOpen, onClose }: Props) => {
  const { about } = useContent();
  const { currently } = about;
  const imageRef = useRef<HTMLDivElement>(null);
  const currentlyRef = useRef<HTMLDivElement>(null);
  const { animationsEnabled } = useAnimationPreference();

  const titleTextRef = useRef<AnimatedTextHandle>(null);
  const descriptionTextRef = useRef<AnimatedTextHandle>(null);

  const handleOpenComplete = useCallback(() => {
    titleTextRef.current?.triggerAnimation();
    setTimeout(() => descriptionTextRef.current?.triggerAnimation(), 50);

    if (!animationsEnabled) {
      if (imageRef.current) gsap.set(imageRef.current, { opacity: 1 });
      if (currentlyRef.current)
        gsap.set(currentlyRef.current, { opacity: 1, y: 0 });
      return;
    }

    if (imageRef.current) {
      gsap.fromTo(
        imageRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.inOut" },
      );
    }

    if (currentlyRef.current) {
      gsap.fromTo(
        currentlyRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", delay: 0.15 },
      );
    }
  }, [animationsEnabled]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About"
      onOpenComplete={handleOpenComplete}
    >
      {/* Title */}
      <AnimatedText
        ref={titleTextRef}
        as="h2"
        className="mb-3 font-regular text-lg text-neutral-950 lg:text-xl"
        trigger="manual"
      >
        {about.headline}
      </AnimatedText>

      {/* Description */}
      <AnimatedText
        ref={descriptionTextRef}
        as="p"
        className="mb-12 font-light text-base text-neutral-950/70"
        trigger="manual"
      >
        {about.intro}
      </AnimatedText>

      {/* Hero Image */}
      {about.image && (
        <div
          ref={imageRef}
          className="relative inset-border mb-12 aspect-video w-full overflow-hidden rounded-2xl"
          style={{ opacity: 0 }}
        >
          <Image
            src={about.image}
            alt={siteData.owner.name}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Currently Working At */}
      {currently && (
        <div ref={currentlyRef} style={{ opacity: 0 }}>
          <span className="mb-3 block font-regular text-lg text-neutral-950">
            Currently
          </span>
          <a
            href={currently.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl border border-neutral-950/10 p-5 transition-colors duration-200 hover:border-neutral-950/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-regular text-lg text-neutral-950">
                    {currently.name}
                  </span>
                  {currently.since && (
                    <span className="font-light text-base text-neutral-600">
                      {currently.since}
                    </span>
                  )}
                </div>
                {currently.blurb && (
                  <p className="font-light text-base text-neutral-600 leading-relaxed">
                    {currently.blurb}
                  </p>
                )}
              </div>
              {currently.url && (
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-neutral-600 transition-colors duration-200 group-hover:text-neutral-700" />
              )}
            </div>
          </a>
        </div>
      )}
    </Modal>
  );
};

export default AboutModal;
