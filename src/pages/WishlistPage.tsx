import { Link } from "react-router-dom";
import CatalogStatus from "../components/catalog/CatalogStatus";
import ProductCard from "../components/ui/ProductCard";
import { useStore } from "../hooks/useStore";

function WishlistPage() {
  const { catalogError, isCatalogLoading, products, wishlistProductIds } = useStore();
  const wishlistProducts = products.filter(
    (product) => wishlistProductIds.includes(product.id) && product.status === "active",
  );

  if (isCatalogLoading) {
    return <CatalogStatus title="Loading your wishlist" description="Matching saved items with the live catalogue." />;
  }

  if (catalogError) {
    return <CatalogStatus title="Wishlist unavailable" description={catalogError} isError />;
  }

  return (
    <section className="store-page">
      <div className="store-container">
        <div className="border-b border-black pb-7 sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <p className="store-eyebrow text-neutral-500">Saved for later</p>
            <h1 className="store-title mt-3">Your wishlist</h1>
          </div>
          <p className="store-copy mt-4 max-w-md sm:mt-0 sm:text-right">Keep track of the pieces you want to revisit.</p>
        </div>

        {wishlistProducts.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
            {wishlistProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="store-panel mt-8 px-5 py-20 text-center sm:py-28">
            <p className="store-eyebrow text-neutral-500">Wishlist</p>
            <h2 className="store-section-title mt-3">No saved products yet</h2>
            <p className="store-copy mx-auto mt-4 max-w-md">Use the heart on a product to add it to this list.</p>
            <Link to="/shop" className="store-button-primary mt-7">
              Explore products
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default WishlistPage;
