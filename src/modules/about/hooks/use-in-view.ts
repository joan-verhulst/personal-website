"use client";

import { type RefObject, useEffect, useState } from "react";

const useInView = (ref: RefObject<Element | null>) => {
  const [isInView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isInView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, isInView]);

  return isInView;
};

export default useInView;
