import { Link } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import CatalogStatus from "../catalog/CatalogStatus";
import ProductCard from "../ui/ProductCard";
import StoreIcon from "../ui/StoreIcon";

function FeaturedProducts() {
  const { catalogError, isCatalogLoading, products } = useStore();
  const featuredProducts = products
    .filter((product) => product.featured && product.status === "active")
    .slice(0, 4);

  if (isCatalogLoading) {
    return <CatalogStatus title="Loading featured products" description="Fetching the latest collection." className="store-section bg-[#f4f2ed] px-5 text-center" />;
  }

  if (catalogError) {
    return <CatalogStatus title="Featured products unavailable" description={catalogError} className="store-section bg-[#f4f2ed] px-5 text-center" isError />;
  }

  return (
    <section id="shop" className="store-section bg-[#f4f2ed]">
      <div className="store-container">
        <div className="mb-8 flex items-end justify-between gap-5 sm:mb-10">
          <div className="max-w-2xl">
            <p className="store-eyebrow text-neutral-500">The UNFAZED edit</p>
            <h2 className="store-section-title mt-3">Current favourites</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-2 border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.1em] sm:flex">
            Shop all
            <StoreIcon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-5">
          {featuredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>

        <Link to="/shop" className="store-button-secondary mt-8 w-full sm:hidden">Shop all products</Link>
      </div>
    </section>
  );
}

export default FeaturedProducts;
