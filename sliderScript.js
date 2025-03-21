
  /**
   * Initialize the slider on the given container element.
   * This function does not call the global document; it only uses the container
   * (and container.ownerDocument for element creation) to build the slider.
   *
   * @param {HTMLElement} container - The element containing the slider.
   */
  function initSlider(container) {
    // Define the slide width in vw.
    const slideWidth = 100; // Each slide is 100vw wide.
    // Conversion factor: 1px = (100 / viewportWidth) vw.
    const pxToVw = 100 / window.innerWidth;
    // Define thresholds in vw units (based on desired pixel values).
    const dragThreshold = 20 * pxToVw;         // e.g. 20px movement threshold.
    const slideChangeThreshold = 100 * pxToVw;   // e.g. 100px movement threshold.

    let currentSlide = 0;
    let totalSlides = 0;
    let autoSlideInterval;
    const autoSlideIntervalTime = 115000; // autoslide interval (115 seconds)

    let isDragging = false;
    let startX = 0;
    let currentTranslate = 0; // in vw units
    let prevTranslate = 0;    // in vw units
    let dragDelta = 0;        // in vw units

    // Ensure TMA is defined (for demonstration)
    if (typeof TMA === 'undefined') {
      window.TMA = {
        navigate: function(variable) {
          console.log("Navigating to: " + variable);
          // Insert actual navigation logic here.
        }
      };
    }

    // Helper function to show a slide by setting the transform.
    function showSlide(index) {
      const slidesContainer = container.querySelector('.slides');
      slidesContainer.style.transition = 'transform 0.5s ease';
      slidesContainer.style.transform = 'translateX(' + (-slideWidth * index) + 'vw)';
      currentSlide = index;
    }

    // Restart the autoslide timer.
    function resetAutoSlide() {
      clearInterval(autoSlideInterval);
      autoSlideInterval = setInterval(() => {
        const next = (currentSlide === totalSlides - 1) ? 0 : currentSlide + 1;
        showSlide(next);
        prevTranslate = -slideWidth * next;
      }, autoSlideIntervalTime);
    }

    // Add pointer event listeners for drag functionality.
    function addDragListeners(slidesContainer) {
      slidesContainer.addEventListener('pointerdown', dragStart);
      slidesContainer.addEventListener('pointermove', dragMove);
      slidesContainer.addEventListener('pointerup', dragEnd);
      slidesContainer.addEventListener('pointercancel', dragEnd);
    }

    function dragStart(event) {
      isDragging = true;
      dragDelta = 0;  // reset movement
      startX = event.clientX;
      const slidesContainer = container.querySelector('.slides');
      slidesContainer.style.transition = 'none';
      slidesContainer.setPointerCapture(event.pointerId);
      clearInterval(autoSlideInterval);
    }

    function dragMove(event) {
      if (!isDragging) return;
      const currentX = event.clientX;
      // Convert pointer movement (px) to vw units.
      const deltaX = (currentX - startX) * pxToVw;
      dragDelta = deltaX;
      currentTranslate = prevTranslate + deltaX;
      const slidesContainer = container.querySelector('.slides');
      slidesContainer.style.transform = `translateX(${currentTranslate}vw)`;
    }

    function dragEnd(event) {
      if (!isDragging) return;
      isDragging = false;
      const slidesContainer = container.querySelector('.slides');
      slidesContainer.releasePointerCapture(event.pointerId);
      // Calculate final movement in vw units.
      const finalDelta = (event.clientX - startX) * pxToVw;
      // If movement is minimal, simulate a click.
      if (Math.abs(finalDelta) < dragThreshold) {
        // Instead of using document.elementFromPoint, use the event target.
        event.target.click();
      } else {
        // Adjust the slide based on the movement.
        if (finalDelta < -slideChangeThreshold && currentSlide < totalSlides - 1) {
          currentSlide++;
        } else if (finalDelta > slideChangeThreshold && currentSlide > 0) {
          currentSlide--;
        }
      }
      showSlide(currentSlide);
      prevTranslate = -slideWidth * currentSlide;
      resetAutoSlide();
    }

    // Load slide data from an external JSON file.
    fetch('https://usernamenotavailable12.github.io/Slider/slidesData.json')
      .then(response => response.json())
      .then(data => {
        // Use the container's "lang" attribute instead of document.documentElement.lang.
        const currentLocale = container.getAttribute('lang') || 'en';
        const slidesData = data[currentLocale] || data['en'];
        totalSlides = slidesData.length;
        const slidesContainer = container.querySelector('.slides');

        // Dynamically render each slide.
        slidesData.forEach(slide => {
          // Create a slide container using container.ownerDocument.
          const slideDiv = container.ownerDocument.createElement('div');
          slideDiv.className = 'slide';

          // Create inner content.
          let innerContent = container.ownerDocument.createElement('div');
          // Set an inline onclick attribute so it appears in the DOM.
          innerContent.setAttribute("onclick", "TMA.navigate('" + slide.navigateVar + "')");

          // Optionally wrap in an anchor if an optionalHref is provided.
          if (slide.optionalHref) {
            const anchor = container.ownerDocument.createElement('a');
            anchor.href = slide.optionalHref;
            anchor.setAttribute("onclick", "TMA.navigate('" + slide.navigateVar + "')");
            anchor.appendChild(innerContent);
            innerContent = anchor;
          }

          // Create and append the image.
          const img = container.ownerDocument.createElement('img');
          img.src = slide.image;
          img.alt = "Slide Image";
          img.loading = "lazy";

          // Create a caption element (customize as needed).
          const caption = container.ownerDocument.createElement('div');
          // Uncomment and modify these lines if you want captions:
          // caption.className = 'caption';
          // caption.textContent = "Slide";

          innerContent.appendChild(img);
          innerContent.appendChild(caption);
          slideDiv.appendChild(innerContent);
          slidesContainer.appendChild(slideDiv);
        });

        // Set the width of the slides container in vw.
        slidesContainer.style.width = (slideWidth * totalSlides) + 'vw';

        // Add drag listeners.
        addDragListeners(slidesContainer);

        // Attach click listeners to the navigation buttons (using container queries).
        const prevBtn = container.querySelector('.nav-button.prev');
        const nextBtn = container.querySelector('.nav-button.next');

        prevBtn.addEventListener('click', () => {
          const prev = (currentSlide === 0) ? totalSlides - 1 : currentSlide - 1;
          showSlide(prev);
          prevTranslate = -slideWidth * prev;
          resetAutoSlide();
        });
        nextBtn.addEventListener('click', () => {
          const next = (currentSlide === totalSlides - 1) ? 0 : currentSlide + 1;
          showSlide(next);
          prevTranslate = -slideWidth * next;
          resetAutoSlide();
        });

        // Start the autoslide.
        resetAutoSlide();
      })
      .catch(error => {
        console.error('Error loading slides data:', error);
      });
  }

  // Example usage:
  // Instead of using document.getElementById, assume you have a reference to the container.
  // For instance, if you already have a variable "carouselEl" that points to the carousel element:
  const carouselEl = document.getElementById('carousel'); // This line is just for obtaining the container.
  initSlider(carouselEl);
