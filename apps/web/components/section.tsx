import type { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  bgColor?: string;
}

const Section = ({ children, bgColor }: SectionProps) => (
  <section className={`py-20 md:py-32 ${bgColor ?? ""}`}>
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </section>
);

export default Section;
