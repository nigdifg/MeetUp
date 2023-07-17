import React, { useEffect, useState } from "react";
import styles from "../styles";
import { Navbar, Hero, Stats, Testimonials, Footer } from "./index";
import Features from "./Features";
import { home, feedback, features, user } from "../assets";
import { useDataLayerValue } from "../Datalayer/DataLayer";

const HomeDock = () => {
  const [sidebarVis, setSidebarVis] = useState(false);
  const appearSidebar = () => {
    if (window.scrollY >= 300) {
      setSidebarVis(true);
    } else {
      setSidebarVis(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", appearSidebar);
  }, []);

  return (
    <div className="App-Dock bg-primary w-full h-full overflow-hidden">
      <div className={`sidebar-nav ${sidebarVis && "sidebar-nav-appear"}`}>
        <a href="#">
          <img src={home} alt="" />
        </a>
        <a href="#features">
          <img src={features} alt="" />
        </a>
        <a href="#feedbacks">
          <img src={feedback} alt="" />
        </a>
        <a href="/profile">
          <img src={user} alt="" />
        </a>
      </div>
      <div className={`${styles.paddingX} ${styles.flexCenter}`}>
        <div className="flex w-full xl:px-6">
          <Navbar />
        </div>
      </div>
      <div className={`bg-primary ${styles.flexStart}`}>
        <div className={`${styles.boxWidth}`}>
          <Hero />
        </div>
      </div>
      <div className={`bg-primary ${styles.paddingX} ${styles.flexStart}`}>
        <div className={`${styles.boxWidth}`}>
          <Stats />
          <Features />
          <Testimonials />
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default HomeDock;
