import { Link } from "react-router-dom";

const shopLinks = [
  { label: "New arrivals", to: "/shop" },
  { label: "Women", to: "/shop?category=women" },
  { label: "Men", to: "/shop?category=men" },
  { label: "Accessories", to: "/shop?category=accessories" },
  { label: "Footwear", to: "/shop?category=footwear" },
];

const customerLinks = [
  { label: "My account", to: "/account" },
  { label: "Orders", to: "/account/orders" },
  { label: "Wishlist", to: "/wishlist" },
  { label: "Shopping bag", to: "/cart" },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-950 text-white">
      <div className="store-container py-14 sm:py-20">
        <div className="mb-12 flex flex-col gap-2 border-y border-white/15 py-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <span>Delivery across Nigeria</span>
          <span>Free Nigeria delivery over ₦150,000</span>
        </div>
        <div className="grid gap-12 border-b border-white/15 pb-14 md:grid-cols-[1.5fr_1fr_1fr] lg:grid-cols-[2fr_1fr_1fr_1.25fr]">
          <div className="max-w-sm">
            <Link to="/" className="text-xl font-black tracking-[0.24em]">UNFAZED</Link>
            <p className="mt-5 text-sm leading-7 text-white/60">
              Contemporary essentials and statement pieces designed in Nigeria.
            </p>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
              Lagos · Nigeria
            </p>
          </div>

          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Customer" links={customerLinks} />

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/45">Secure checkout</p>
            <p className="mt-4 text-sm leading-7 text-white/65">
              Payments are processed securely by Paystack. Prices are available in NGN and USD.
            </p>
            <Link to="/shop" className="mt-6 inline-flex border-b border-white pb-1 text-xs font-bold uppercase tracking-[0.12em]">
              Explore the collection
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-[11px] uppercase tracking-[0.1em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} UNFAZED. All rights reserved.</p>
          <p>Designed in Lagos, Nigeria.</p>
        </div>
      </div>
    </footer>
  );
}

interface FooterColumnProps {
  title: string;
  links: Array<{ label: string; to: string }>;
}

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/45">{title}</p>
      <div className="mt-4 flex flex-col gap-3 text-sm">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="w-fit text-white/70 transition hover:text-white">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Footer;
