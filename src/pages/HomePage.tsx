import Categories from "../components/home/Categories";
import FeaturedProducts from "../components/home/FeaturedProducts";
import Hero from "../components/home/Hero";
import Newsletter from "../components/home/Newsletter";

function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <Newsletter />
    </>
  );
}

export default HomePage;
