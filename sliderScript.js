(function(){
  // Try to obtain the root (shadow DOM if available, otherwise fallback to document)
  var root = (document.currentScript && document.currentScript.getRootNode()) || document;

  // Wait until the carousel container is available in the root
  function init() {
    var container = root.querySelector('#carousel');
    if (!container) {
      // If not found, retry after a short delay.
      return setTimeout(init, 50);
    }
    
    // Define the slide width in vw.
    const slideWidth = 100; // Each slide is 100vw wide.
    // Conversion factor: 1px = (100 / viewportWidth) vw.
    const pxToVw = 100 / window.innerWidth;
    // Define thresholds in vw units.
    const dragThreshold = 20 * pxToVw;         // e.g. 20px movement threshold.
    const slideChangeThreshold = 100 * pxToVw;   // e.g. 100px movement threshold.

    let currentSlide = 0;
    let totalSlides = 0;
    let autoSlideInterval;
    const autoSlideIntervalTime = 5000; // autoslide every 5000ms

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

    // Show a slide by setting the transform in vw.
    function showSlide(index) {
      const slidesContainer = container.querySelector('#slides');
      slidesContainer.style.transition = 'transform 0.5s ease';
      slidesContainer.style.transform = 'translateX(' + (-slideWidth * index) + 'vw)';
      currentSlide = index;
    }
    
    function resetAutoSlide() {
      clearInterval(autoSlideInterval);
      autoSlideInterval = setInterval(() => {
        const next = (currentSlide === totalSlides - 1) ? 0 : currentSlide + 1;
        showSlide(next);
        prevTranslate = -slideWidth * next;
      }, autoSlideIntervalTime);
    }

    // Drag functionality using pointer events on the slides container.
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
      const slidesContainer = container.querySelector('#slides');
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
      const slidesContainer = container.querySelector('#slides');
      slidesContainer.style.transform = `translateX(${currentTranslate}vw)`;
    }
    
    function dragEnd(event) {
      if (!isDragging) return;
      isDragging = false;
      const slidesContainer = container.querySelector('#slides');
      slidesContainer.releasePointerCapture(event.pointerId);
      // Calculate final movement in vw units.
      const finalDelta = (event.clientX - startX) * pxToVw;
      // If movement is minimal, simulate a click.
      if (Math.abs(finalDelta) < dragThreshold) {
        const tappedEl = document.elementFromPoint(event.clientX, event.clientY);
        if (tappedEl) {
          // Dispatch a click event on the tapped element.
          setTimeout(() => {
            tappedEl.click();
          }, 0);
        }
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
        // Use the language from the main document.
        const currentLocale = document.documentElement.lang || 'en';
        const slidesData = data[currentLocale] || data['en'];
        totalSlides = slidesData.length;
        const slidesContainer = container.querySelector('#slides');

        // Dynamically render each slide.
        slidesData.forEach(slide => {
          const slideDiv = document.createElement('div');
          slideDiv.className = 'slide';

          // Create inner content.
          let innerContent = document.createElement('div');
          innerContent.setAttribute("onclick", "TMA.navigate('" + slide.navigateVar + "')");

          // Optionally wrap in an anchor if provided.
          if (slide.optionalHref) {
            const anchor = document.createElement('a');
            anchor.href = slide.optionalHref;
            anchor.setAttribute("onclick", "TMA.navigate('" + slide.navigateVar + "')");
            anchor.appendChild(innerContent);
            innerContent = anchor;
          }

          // Create and append the image.
          const img = document.createElement('img');
          img.src = slide.image;
          img.alt = "Slide Image";
          img.loading = "lazy";

          // Optional caption (customize as needed).
          const caption = document.createElement('div');
          // Example: caption.textContent = "Slide";

          innerContent.appendChild(img);
          innerContent.appendChild(caption);
          slideDiv.appendChild(innerContent);
          slidesContainer.appendChild(slideDiv);
        });

        // Set the width of the slides container in vw.
        slidesContainer.style.width = (slideWidth * totalSlides) + 'vw';

        // Add drag listeners.
        addDragListeners(slidesContainer);

        // Navigation buttons.
        root.querySelector('#prevBtn').addEventListener('click', () => {
          const prev = (currentSlide === 0) ? totalSlides - 1 : currentSlide - 1;
          showSlide(prev);
          prevTranslate = -slideWidth * prev;
          resetAutoSlide();
        });
        root.querySelector('#nextBtn').addEventListener('click', () => {
          const next = (currentSlide === totalSlides - 1) ? 0 : currentSlide + 1;
          showSlide(next);
          prevTranslate = -slideWidth * next;
          resetAutoSlide();
        });

        // Start auto-sliding.
        resetAutoSlide();
      })
      .catch(error => {
        console.error('Error loading slides data:', error);
      });
  }
  
  // Begin initialization.
  init();
})();