import { Link } from "react-router-dom";
import fallbackHero from "../../assets/hero.png";
import { useStore } from "../../hooks/useStore";
import StoreIcon from "../ui/StoreIcon";

function getCampaignImage(url: string | undefined) {
  if (!url) {
    return fallbackHero;
  }
  return url.replace(/([?&])w=\d+/, "$1w=1600");
}

function Hero() {
  const { categories, products } = useStore();
  const activeProducts = products.filter((product) => product.status === "active");
  const primaryImage = getCampaignImage(activeProducts[0]?.images[0]?.url ?? categories[1]?.image);
  const secondaryImage = getCampaignImage(activeProducts[1]?.images[0]?.url ?? categories[0]?.image);

  return (
    <section id="home" className="bg-[#efede7] pt-[5.5rem] lg:pt-24">
      <div className="store-container grid lg:min-h-[calc(100svh-4.25rem)] lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
        <div className="order-2 flex flex-col justify-center py-12 pr-0 sm:py-16 lg:order-1 lg:py-20 lg:pr-14 xl:pr-20">
          <p className="store-eyebrow text-neutral-600">New collection · 2026</p>
          <h1 className="store-display mt-5 max-w-3xl">Designed to be noticed. Built to be lived in.</h1>
          <p className="store-copy mt-6 max-w-xl">
            Elevated everyday pieces, confident silhouettes, and considered details from Lagos to the world.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop" className="store-button-primary">
              Shop new arrivals
              <StoreIcon name="arrow" className="h-4 w-4" />
            </Link>
            <Link to="/shop?category=women" className="store-button-secondary">Explore women</Link>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-3 border-y border-black/15 py-4 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-600 sm:text-xs">
            <span>Made for movement</span>
            <span className="text-center">NGN & USD</span>
            <span className="text-right">Delivery across Nigeria</span>
          </div>
        </div>

        <div className="order-1 grid min-h-[55svh] grid-cols-1 gap-2 lg:order-2 lg:min-h-[42rem] lg:grid-cols-[1.55fr_0.75fr]">
          <div className="relative overflow-hidden bg-stone-200">
            <img src={primaryImage} alt="UNFAZED new collection campaign" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 to-transparent p-5 pt-20 text-white sm:p-7">
              <div>
                <p className="store-eyebrow text-white/70">The new edit</p>
                <p className="mt-2 text-xl font-semibold sm:text-2xl">Quiet confidence, bold presence.</p>
              </div>
              <span className="hidden text-xs font-bold uppercase tracking-[0.12em] sm:block">UNFAZED / 26</span>
            </div>
          </div>

          <div className="hidden grid-rows-[1.7fr_0.7fr] gap-2 lg:grid">
            <div className="relative overflow-hidden bg-stone-200">
              <img src={secondaryImage} alt="UNFAZED collection detail" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="flex flex-col justify-between bg-neutral-950 p-5 text-white xl:p-6">
              <p className="store-eyebrow text-white/50">Nigeria to the world</p>
              <p className="text-lg font-semibold leading-snug">Modern essentials without the ordinary.</p>
              <Link to="/shop" className="flex items-center justify-between border-t border-white/20 pt-4 text-xs font-bold uppercase tracking-[0.1em]">
                View collection
                <StoreIcon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
