import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="store-page flex min-h-[75vh] items-center">
      <div className="store-container text-center">
        <p className="store-eyebrow text-neutral-500">Error 404</p>
        <h1 className="store-title mx-auto mt-4 max-w-3xl">This page is out of season</h1>
        <p className="store-copy mx-auto mt-5 max-w-lg">
          The page may have moved, but the latest UNFAZED collection is ready for you.
        </p>
        <Link to="/shop" className="store-button-primary mt-8">
          Return to shop
        </Link>
      </div>
    </section>
  );
}

export default NotFoundPage;
