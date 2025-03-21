(function() {
  // Use 'this' as the root when executed in Shadow DOM, fallback to document otherwise
  var root = this && this.querySelector ? this : document;

  // Wait until the carousel container is available in the root
  function init() {
      var container = root.querySelector('#carousel');
      if (!container) {
          return setTimeout(init, 50);
      }

      const slideWidth = 100;
      const pxToVw = 100 / window.innerWidth;
      const dragThreshold = 20 * pxToVw;
      const slideChangeThreshold = 100 * pxToVw;

      let currentSlide = 0;
      let totalSlides = 0;
      let autoSlideInterval;
      const autoSlideIntervalTime = 5000;

      let isDragging = false;
      let startX = 0;
      let currentTranslate = 0;
      let prevTranslate = 0;
      let dragDelta = 0;

      if (typeof TMA === 'undefined') {
          window.TMA = {
              navigate: function(variable) {
                  console.log("Navigating to: " + variable);
              }
          };
      }

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

      function addDragListeners(slidesContainer) {
          slidesContainer.addEventListener('pointerdown', dragStart);
          slidesContainer.addEventListener('pointermove', dragMove);
          slidesContainer.addEventListener('pointerup', dragEnd);
          slidesContainer.addEventListener('pointercancel', dragEnd);
      }

      function dragStart(event) {
          isDragging = true;
          dragDelta = 0;
          startX = event.clientX;
          const slidesContainer = container.querySelector('#slides');
          slidesContainer.style.transition = 'none';
          slidesContainer.setPointerCapture(event.pointerId);
          clearInterval(autoSlideInterval);
      }

      function dragMove(event) {
          if (!isDragging) return;
          const currentX = event.clientX;
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
          const finalDelta = (event.clientX - startX) * pxToVw;
          if (Math.abs(finalDelta) < dragThreshold) {
              // Use root.elementFromPoint instead of document.elementFromPoint
              const tappedEl = root.elementFromPoint ? root.elementFromPoint(event.clientX, event.clientY) : document.elementFromPoint(event.clientX, event.clientY);
              if (tappedEl) {
                  setTimeout(() => tappedEl.click(), 0);
              }
          } else {
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

      fetch('https://usernamenotavailable12.github.io/Slider/slidesData.json')
          .then(response => response.json())
          .then(data => {
              const currentLocale = document.documentElement.lang || 'en';
              const slidesData = data[currentLocale] || data['en'];
              totalSlides = slidesData.length;
              const slidesContainer = container.querySelector('#slides');

              slidesData.forEach(slide => {
                  const slideDiv = document.createElement('div');
                  slideDiv.className = 'slide';
                  let innerContent = document.createElement('div');
                  innerContent.setAttribute("onclick", "TMA.navigate('" + slide.navigateVar + "')");
                  if (slide.optionalHref) {
                      const anchor = document.createElement('a');
                      anchor.href = slide.optionalHref;
                      anchor.setAttribute("onclick", "TMA.navigate('" + slide.navigateVar + "')");
                      anchor.appendChild(innerContent);
                      innerContent = anchor;
                  }
                  const img = document.createElement('img');
                  img.src = slide.image;
                  img.alt = "Slide Image";
                  img.loading = "lazy";
                  const caption = document.createElement('div');
                  innerContent.appendChild(img);
                  innerContent.appendChild(caption);
                  slideDiv.appendChild(innerContent);
                  slidesContainer.appendChild(slideDiv);
              });

              slidesContainer.style.width = (slideWidth * totalSlides) + 'vw';
              addDragListeners(slidesContainer);

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

              resetAutoSlide();
          })
          .catch(error => {
              console.error('Error loading slides data:', error);
          });
  }

  init();
})();