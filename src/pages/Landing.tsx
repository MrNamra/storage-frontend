import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Process } from "@/components/process";
import { Pricing } from "@/components/pricing";
import { Testimonials } from "@/components/testimonials";
import { CTA } from "@/components/cta";
import { Footer } from "@/components/footer";
import { useEffect } from "react";
import constants from "@/lib/constants";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const USER = localStorage.getItem(constants.USER);
    if (USER) {
      navigate("/dashboard");
    }
  }, []);
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <Process />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
};

export default Landing;
