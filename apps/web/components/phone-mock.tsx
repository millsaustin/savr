import Image from "next/image";

interface PhoneMockProps {
  alt?: string;
}

const PhoneMock = ({ alt = "Savr mobile preview" }: PhoneMockProps) => (
  <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 shadow-2xl">
    <div className="relative aspect-[9/19]">
      <Image
        src="/mock.png"
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 320px"
        className="object-cover"
        priority
      />
    </div>
  </div>
);

export default PhoneMock;
