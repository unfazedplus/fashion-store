import { Link } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import CatalogStatus from "../catalog/CatalogStatus";
import StoreIcon from "../ui/StoreIcon";

function Categories() {
  const { catalogError, categories, isCatalogLoading } = useStore();

  if (isCatalogLoading) {
    return <CatalogStatus title="Loading categories" description="Fetching the current collection." className="store-container store-section text-center" />;
  }

  if (catalogError) {
    return <CatalogStatus title="Categories unavailable" description={catalogError} className="store-container store-section text-center" isError />;
  }

  return (
    <section id="categories" className="store-section bg-white">
      <div className="store-container">
        <div className="mb-8 flex items-end justify-between gap-5 sm:mb-10">
          <div>
            <p className="store-eyebrow text-neutral-500">Shop by category</p>
            <h2 className="store-section-title mt-3">Find your uniform</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-2 border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.1em] sm:flex">
            View all
            <StoreIcon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.id} to={`/shop?category=${category.slug}`} className="group relative aspect-[3/4] overflow-hidden bg-stone-200">
              <img src={category.image} alt={category.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{category.name}</h3>
                    <p className="mt-2 hidden max-w-xs text-xs leading-5 text-white/70 lg:block">{category.description}</p>
                  </div>
                  <StoreIcon name="arrow" className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <Link to="/shop" className="store-button-secondary mt-6 w-full sm:hidden">View all products</Link>
      </div>
    </section>
  );
}

export default Categories;
