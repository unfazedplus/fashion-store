import type { ReactNode } from "react";

interface AuthCardProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

function AuthCard({ eyebrow, title, description, children, footer }: AuthCardProps) {
  return (
    <section className="store-page flex min-h-[82vh] items-center bg-[var(--store-canvas)]">
      <div className="store-container flex justify-center">
        <div className="store-panel w-full max-w-[34rem] px-5 py-9 sm:px-10 sm:py-11">
          <p className="store-eyebrow text-neutral-500">{eyebrow}</p>
          <h1 className="store-section-title mt-3">{title}</h1>
          <p className="store-copy mt-4">{description}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-7 border-t border-[var(--store-line)] pt-6 text-center text-sm text-neutral-600">{footer}</div>}
        </div>
      </div>
    </section>
  );
}

export default AuthCard;
