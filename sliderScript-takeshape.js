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

  // 🚨 Only clear cache and refetch if iframe is loaded for the first time in this session
  const isFirstIframeLoad = !window.__carouselInitializedInIframe;
  if (isFirstIframeLoad) {
    sessionStorage.removeItem(cacheKey);
    window.__carouselInitializedInIframe = true;
  }

  function render(slidesData) {
    const container = root.querySelector('#carousel');
    if (!container) return setTimeout(() => render(slidesData), 50);

    const slideWidth = 100;
    const pxToVw = 100 / window.innerWidth;
    const dragThreshold = 20 * pxToVw;
    const slideChangeThreshold = 100 * pxToVw;

    const slidesContainer = container.querySelector('#slides');
    let currentSlide = 0;
    let totalSlides = slidesData.length;
    let autoSlideInterval;
    let autoSlideIntervalTime = 8000;

    let isDragging = false;
    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let dragDelta = 0;

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
      dragDelta = 0;
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
      sourceMobile.media = "(max-width: 600px)";
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

    slidesContainer.style.width = (slideWidth * totalSlides) + 'vw';
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
      const prev = (currentSlide === 0) ? totalSlides - 1 : currentSlide - 1;
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

  function init() {
    const lang = getQueryParam('lang', 'ka');
    const page = getQueryParam('page', 'sport');

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const allSlides = JSON.parse(cached);
        const slidesData = allSlides
          .filter(slide => slide.pages.includes(page))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return render(slidesData);
      } catch (e) {
        console.warn('Corrupted cache. Refetching.');
      }
    }

    fetch('https://cdn.takeshape.io/project/5da2b4d5-59f6-412a-82c3-f6a272b532be/production/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TakeShape-Token': 'dde685a904334d79915c7a9f31860f36'
      },
      body: JSON.stringify({
        query: `
          query GetSlides($locale: String!) {
            getSlideList(locale: $locale, onlyEnabled: true, size: 50) {
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
        const allSlides = data?.getSlideList?.items || [];
        sessionStorage.setItem(cacheKey, JSON.stringify(allSlides));
        const slidesData = allSlides
          .filter(slide => slide.pages.includes(page))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        render(slidesData);
      })
      .catch(err => console.error('TakeShape fetch error:', err));
  }

  init();
})();
