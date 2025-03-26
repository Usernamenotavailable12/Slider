(function () {
  const root = this && this.querySelector ? this : document;

  function getQueryParam(key, fallback = '') {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || fallback;
  }

  // Helper function to only replace spaces with %20.
  function fixUrl(url) {
    return url.replace(/ /g, '%20');
  }

  function init() {
    const container = root.querySelector('#carousel');
    if (!container) return setTimeout(init, 50);

    const lang = getQueryParam('lang', 'ka');
    const page = getQueryParam('page', 'home');
    const endpoint = 'https://api.takeshape.io/project/f2b70d9b-56f9-4d2d-be98-874fcbc02a46/production/graphql';
    const token = '86f2864b8683471ab46e8958c17edaaa';

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TakeShape-Token': token
      },
      body: JSON.stringify({
        query: `
          query GetSlides($locale: String!) {
            getSlideList(locale: $locale) {
              items {
                caption
                pages
                sortOrder
                NavigateVar
                OptionalHref
                image {
                  path
                }
                imageMobile {
                  path
                }
              }
            }
          }
        `,
        variables: { locale: lang }
      })
    })
      .then(res => res.json())
      .then(({ data }) => {
        const allSlides = data.getSlideList.items || [];

        // Filter by page and sort by sortOrder.
        const slidesData = allSlides
          .filter(slide => slide.pages.includes(page))
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const slideWidth = 100;
        const pxToVw = 100 / window.innerWidth;
        const dragThreshold = 20 * pxToVw;
        const slideChangeThreshold = 100 * pxToVw;

        const slidesContainer = container.querySelector('#slides');
        let currentSlide = 0;
        let totalSlides = slidesData.length;
        let autoSlideInterval;
        let autoSlideIntervalTime = 5000;

        let isDragging = false;
        let startX = 0;
        let currentTranslate = 0;
        let prevTranslate = 0;
        let dragDelta = 0;

        // Create the indicators container.
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.id = 'indicators';

        function updateIndicators() {
          const dots = indicatorsContainer.querySelectorAll('.indicator-dot');
          dots.forEach((dot, index) => {
            if (index === currentSlide) {
              dot.classList.add('active');
            } else {
              dot.classList.remove('active');
            }
          });
        }

        function showSlide(index) {
          slidesContainer.style.transition = 'transform 0.5s ease';
          slidesContainer.style.transform = `translateX(${-slideWidth * index}vw)`;
          currentSlide = index;
          updateIndicators();
        }

        function startAutoSlide() {
          clearInterval(autoSlideInterval);
          autoSlideInterval = setInterval(() => {
            const next = (currentSlide + 1) % totalSlides;
            showSlide(next);
            prevTranslate = -slideWidth * next;
          }, autoSlideIntervalTime);
        }

        function stopAutoSlide() {
          clearInterval(autoSlideInterval);
        }

        function dragStart(event) {
          isDragging = true;
          dragDelta = 0;
          slidesContainer.style.transition = 'none';
          stopAutoSlide();
        
          if (event.type.startsWith('touch')) {
            startX = event.touches[0].clientX;
          } else {
            startX = event.clientX;
            if (typeof event.pointerId !== 'undefined') {
              slidesContainer.setPointerCapture(event.pointerId);
            }
          }
        }
        
        function dragMove(event) {
          if (!isDragging) return;
          let currentX;
          if (event.type.startsWith('touch')) {
            currentX = event.touches[0].clientX;
            event.preventDefault();
          } else {
            currentX = event.clientX;
          }
          const deltaX = (currentX - startX) * pxToVw;
          currentTranslate = prevTranslate + deltaX;
          slidesContainer.style.transform = `translateX(${currentTranslate}vw)`;
        }
        
        function dragEnd(event) {
          if (!isDragging) return;
          isDragging = false;
          if (!event.type.startsWith('touch') && typeof event.pointerId !== 'undefined') {
            slidesContainer.releasePointerCapture(event.pointerId);
          }
          let endX;
          if (event.type.startsWith('touch')) {
            endX = event.changedTouches[0].clientX;
          } else {
            endX = event.clientX;
          }
          const finalDelta = (endX - startX) * pxToVw;
          if (Math.abs(finalDelta) < dragThreshold) {
            const tappedEl = root.elementFromPoint(
              endX,
              event.type.startsWith('touch') ? event.changedTouches[0].clientY : event.clientY
            );
            if (tappedEl) setTimeout(() => tappedEl.click(), 0);
          } else {
            if (finalDelta < -slideChangeThreshold && currentSlide < totalSlides - 1) {
              currentSlide++;
            } else if (finalDelta > slideChangeThreshold && currentSlide > 0) {
              currentSlide--;
            }
          }
          showSlide(currentSlide);
          prevTranslate = -slideWidth * currentSlide;
          startAutoSlide();
        }

        function sendNavigateMessage(variable) {
          window.parent.postMessage({ type: 'TMA_NAVIGATE', payload: variable }, '*');
        }

        // Build each slide.
        slidesData.forEach(slide => {
          const slideDiv = document.createElement('div');
          slideDiv.className = 'slide';

          let innerContent = document.createElement('div');
          innerContent.className = 'slide-content';

          if (slide.OptionalHref) {
            const anchor = document.createElement('a');
            anchor.href = slide.OptionalHref;
            anchor.addEventListener("click", (e) => {
              e.preventDefault();
              window.parent.postMessage({
                type: 'TMA_HREF',
                payload: slide.OptionalHref
              }, '*');
            });
            anchor.appendChild(innerContent);
            innerContent = anchor;
          }

          innerContent.addEventListener("click", () => {
            sendNavigateMessage(slide.NavigateVar);
          });

          // Create a picture element for responsive images.
          const picture = document.createElement('picture');

          // Mobile-specific image for screen widths 768px and below.
          const sourceMobile = document.createElement('source');
          sourceMobile.media = "(max-width: 768px)";
          sourceMobile.srcset = 'https://www.ambassadoribet.com/_internal/ts-images/' + fixUrl(slide.imageMobile.path);
          picture.appendChild(sourceMobile);

          // Default image for larger screens.
          const img = document.createElement('img');
          img.src = 'https://www.ambassadoribet.com/_internal/ts-images/' + fixUrl(slide.image.path);
          img.alt = "Slide Image";
          img.loading = "lazy";
          picture.appendChild(img);

          innerContent.appendChild(picture);

          // Caption element (if needed).
          const caption = document.createElement('div');
          // Uncomment these lines if you want to display captions:
          // caption.className = 'slide-caption';
          // caption.textContent = slide.caption || "";
          // innerContent.appendChild(caption);

          slideDiv.appendChild(innerContent);
          slidesContainer.appendChild(slideDiv);
        });

        slidesContainer.style.width = (slideWidth * totalSlides) + 'vw';

        // Build slider indicators (dots).
        for (let i = 0; i < totalSlides; i++) {
          const dot = document.createElement('span');
          dot.className = 'indicator-dot' + (i === currentSlide ? ' active' : '');
          dot.addEventListener('click', () => {
            showSlide(i);
            prevTranslate = -slideWidth * i;
            currentSlide = i;
            startAutoSlide();
          });
          indicatorsContainer.appendChild(dot);
        }
        container.appendChild(indicatorsContainer);

        const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

        if (isTouchDevice) {
          slidesContainer.addEventListener('touchstart', dragStart, { passive: false });
          slidesContainer.addEventListener('touchmove', dragMove, { passive: false });
          slidesContainer.addEventListener('touchend', dragEnd);
          slidesContainer.addEventListener('touchcancel', dragEnd);
        } else {
          slidesContainer.addEventListener('pointerdown', dragStart, { passive: false });
          slidesContainer.addEventListener('pointermove', dragMove, { passive: false });
          slidesContainer.addEventListener('pointerup', dragEnd);
          slidesContainer.addEventListener('pointercancel', dragEnd);
        }

        root.querySelector('#prevBtn')?.addEventListener('click', () => {
          const prev = (currentSlide === 0) ? totalSlides - 1 : currentSlide - 1;
          showSlide(prev);
          prevTranslate = -slideWidth * prev;
          startAutoSlide();
        });

        root.querySelector('#nextBtn')?.addEventListener('click', () => {
          const next = (currentSlide + 1) % totalSlides;
          showSlide(next);
          prevTranslate = -slideWidth * next;
          startAutoSlide();
        });

        showSlide(0);
        startAutoSlide();
      })
      .catch(err => console.error('TakeShape fetch error:', err));
  }

  init();
})();
