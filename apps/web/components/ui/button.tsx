import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "outline";

type ButtonBaseProps = {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

type ButtonAsAnchor = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type ButtonAsButton = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonProps = ButtonAsAnchor | ButtonAsButton;

type AnchorButtonRest = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

const styles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-white hover:bg-brand-dark focus-visible:ring-brand-primary/50",
  outline:
    "border border-brand-primary text-brand-primary hover:bg-brand-secondary focus-visible:ring-brand-primary/40",
};

const baseStyles =
  "inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:transition-all disabled:cursor-not-allowed disabled:opacity-60";

const Button = (props: ButtonProps) => {
  const { variant = "primary", className, children, ...rest } = props;

  if ("href" in props && props.href) {
    const { href, ...anchorRest } = rest as AnchorButtonRest;
    return (
      <Link
        href={href}
        className={cn(baseStyles, styles[variant], className)}
        {...anchorRest}
      >
        {children}
      </Link>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={cn(baseStyles, styles[variant], className)} {...buttonRest}>
      {children}
    </button>
  );
};

export default Button;
