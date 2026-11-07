interface CatalogStatusProps {
  title: string;
  description: string;
  className?: string;
  isError?: boolean;
}

function CatalogStatus({
  title,
  description,
  className = "store-page flex min-h-[75vh] items-center text-center",
  isError = false,
}: CatalogStatusProps) {
  return (
    <section className={className} role={isError ? "alert" : "status"}>
      <div className="store-container">
        <div className="mx-auto max-w-xl">
          <p className={`store-eyebrow ${isError ? "text-red-700" : "text-neutral-500"}`}>{isError ? "Catalogue issue" : "UNFAZED"}</p>
          <h1 className="store-section-title mt-3">{title}</h1>
          <p className={`store-copy mt-4 ${isError ? "text-red-700" : ""}`}>{description}</p>
        </div>
      </div>
    </section>
  );
}

export default CatalogStatus;
