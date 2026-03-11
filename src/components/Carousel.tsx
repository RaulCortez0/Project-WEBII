import { useState } from "react";
import "./Carousel.css";

const images = [
  "/img1.jpg",
  "/img2.jpg",
  "/img3.jpg"
];

const Carousel = () => {

  const [index, setIndex] = useState(0);

  const next = () => {
    setIndex((index + 1) % images.length);
  };

  const prev = () => {
    setIndex((index - 1 + images.length) % images.length);
  };

  return (
    <div className="carousel">

      <button className="carousel-btn left" onClick={prev}>
        ❮
      </button>

      <img src={images[index]} className="carousel-image" />

      <button className="carousel-btn right" onClick={next}>
        ❯
      </button>

    </div>
  );
};

export default Carousel;