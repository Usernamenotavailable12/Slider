(function () {
  const root = this && this.querySelector ? this : document;
  const cacheKey = 'image-carousel-slides-cache';

  function getQueryParam(key, fallback = '') {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || fallback;
  }

  function fixUrl(url) {
    return url.replace(/ /g, '%20');
  }

  // ✅ Detect and clear cache only on true iframe reload (F5, hard refresh)
  const navEntry = performance.getEntriesByType("navigation")[0];
  const isHardReload = navEntry && navEntry.type === 'reload';
  if (isHardReload) {
    sessionStorage.removeItem(cacheKey);
  }

  function init() {
    const container = root.querySelector('#carousel');
    if (!container) return setTimeout(init, 50);

    const lang = getQueryParam('lang', 'en');
    const page = getQueryParam('page', 'home');
    const endpoint = 'https://api.takeshape.io/project/5da2b4d5-59f6-412a-82c3-f6a272b532be/production/graphql';
    const token = 'dde685a904334d79915c7a9f31860f36';

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const allSlides = JSON.parse(cached);
        renderSlides(allSlides);
        return;
      } catch (e) {
        console.warn('Corrupted cache, refetching.');
      }
    }

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
                image { path }
                imageMobile { path }
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
        sessionStorage.setItem(cacheKey, JSON.stringify(allSlides));
        renderSlides(allSlides);
      })
      .catch(err => console.error('TakeShape fetch error:', err));

    function renderSlides(allSlides) {
      const slidesData = allSlides
        .filter(slide => slide.pages.includes(page))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const slideWidth = 100;
      const pxToVw = 100 / window.innerWidth;
      const dragThreshold = 20 * pxToVw;
      const slideChangeThreshold = 100 * pxToVw;

      const slidesContainer = container.querySelector('#slides');
      let currentSlide = 0;
      const totalSlides = slidesData.length;
      let autoSlideInterval;
      const autoSlideIntervalTime = 8000;

      let isDragging = false;
      let startX = 0;
      let currentTranslate = 0;
      let prevTranslate = 0;

      const indicatorsContainer = document.createElement('div');
      indicatorsContainer.id = 'indicators';

      function updateIndicators() {
        const dots = indicatorsContainer.querySelectorAll('.indicator-dot');
        dots.forEach((dot, index) => {
          dot.classList.toggle('active', index === currentSlide);
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
          document.getElementById('counter').innerHTML = `${currentSlide + 1} / ${totalSlides}`;
        }, autoSlideIntervalTime);
      }

      function stopAutoSlide() {
        clearInterval(autoSlideInterval);
      }

      function dragStart(event) {
        isDragging = true;
        slidesContainer.style.transition = 'none';
        stopAutoSlide();
        startX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
        if (!event.type.startsWith('touch') && event.pointerId !== undefined) {
          slidesContainer.setPointerCapture(event.pointerId);
        }
      }

      function dragMove(event) {
        if (!isDragging) return;
        const currentX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
        if (event.type.startsWith('touch')) event.preventDefault();
        const deltaX = (currentX - startX) * pxToVw;
        currentTranslate = prevTranslate + deltaX;
        slidesContainer.style.transform = `translateX(${currentTranslate}vw)`;
      }

      function dragEnd(event) {
        if (!isDragging) return;
        isDragging = false;
        const endX = event.type.startsWith('touch') ? event.changedTouches[0].clientX : event.clientX;
        if (!event.type.startsWith('touch') && event.pointerId !== undefined) {
          slidesContainer.releasePointerCapture(event.pointerId);
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
        document.getElementById('counter').innerHTML = `${currentSlide + 1} / ${totalSlides}`;
      }

      function sendNavigateMessage(variable) {
        window.parent.postMessage({ type: 'TMA_NAVIGATE', payload: variable }, '*');
      }

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

        const picture = document.createElement('picture');

        const sourceMobile = document.createElement('source');
        sourceMobile.media = "(max-width: 768px)";
        sourceMobile.srcset = 'https://www.ambassadoribet.com/_internal/ts-images/' + fixUrl(slide.imageMobile.path);
        picture.appendChild(sourceMobile);

        const img = document.createElement('img');
        img.src = 'https://www.ambassadoribet.com/_internal/ts-images/' + fixUrl(slide.image.path);
        img.alt = "Slide Image";
        img.loading = "lazy";
        picture.appendChild(img);

        innerContent.appendChild(picture);
        slideDiv.appendChild(innerContent);
        slidesContainer.appendChild(slideDiv);
      });

      slidesContainer.style.width = `${slideWidth * totalSlides}vw`;
      document.getElementById('counter').innerHTML = `${currentSlide + 1} / ${totalSlides}`;

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
        const prev = currentSlide === 0 ? totalSlides - 1 : currentSlide - 1;
        showSlide(prev);
        prevTranslate = -slideWidth * prev;
        startAutoSlide();
        document.getElementById('counter').innerHTML = `${currentSlide + 1} / ${totalSlides}`;
      });

      root.querySelector('#nextBtn')?.addEventListener('click', () => {
        const next = (currentSlide + 1) % totalSlides;
        showSlide(next);
        prevTranslate = -slideWidth * next;
        startAutoSlide();
        document.getElementById('counter').innerHTML = `${currentSlide + 1} / ${totalSlides}`;
      });

      showSlide(0);
      startAutoSlide();
    }
  }

  init();
})();
