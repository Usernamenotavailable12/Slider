(function () {
  var root = this && this.querySelector ? this : document;

  function getQueryParam(key, fallback = '') {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || fallback;
  }

  function init() {
    const container = root.querySelector('#carousel');
    if (!container) return setTimeout(init, 50);

    const lang = getQueryParam('lang', 'en');
    const page = getQueryParam('page', 'home').toLowerCase();
    const endpoint = 'https://eu-west-2.cdn.hygraph.com/content/cm81rsh8f01ni07uowrtk7da5/master';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-control': 'max-age=180, public' },
      cache: 'default',
      body: JSON.stringify({
        query: `
          query ($language: Languages!, $page: Pages!) {
            settings(where: { id: "cm8mrleg9rsya07mem4ovwjcc"}) {
              autoSlideInterval
              slideWidth
            }
            slides(
              where: {
                language: $language,
                pages_contains_some: [$page]
              },
              orderBy: sortOrder_ASC
              first: 50
            ) {
              image { url }
              caption
              navigateVar
              optionalHref
              pages
              sortOrder
            }
          }
        `,
        variables: {
          language: lang, 
          page: page      
        }
      })
    })
    
      .then(res => res.json())
      .then(({ data }) => {
        if (!data) return console.error('No data from CMS');

        const settings = data.settings?.[0] || {};
        const slideWidth = settings.slideWidth || 100;
        const autoSlideIntervalTime = settings.autoSlideInterval || 5000;
        const slidesData = data.slides;

        const slidesContainer = container.querySelector('#slides');
        let currentSlide = 0;
        let totalSlides = slidesData.length;
        let autoSlideInterval;

        let isDragging = false;
        let startX = 0;
        let currentTranslate = 0;
        let prevTranslate = 0;
        let dragDelta = 0;

        const pxToVw = 100 / window.innerWidth;
        const dragThreshold = 20 * pxToVw;
        const slideChangeThreshold = 100 * pxToVw;

        function showSlide(index) {
          slidesContainer.style.transition = 'transform 0.5s ease';
          slidesContainer.style.transform = `translateX(${-slideWidth * index}vw)`;
          currentSlide = index;
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

        function handleDragStart(event) {
          isDragging = true;
          dragDelta = 0;
          if (event.type === 'touchstart') {
            startX = event.touches[0].clientX;
          } else {
            startX = event.clientX;
          }
          slidesContainer.style.transition = 'none';
          slidesContainer.setPointerCapture(event.pointerId);
          stopAutoSlide();
        }

        function handleDragMove(event) {
          if (!isDragging) return;

          
          let currentX;
          if (event.type === 'touchmove') {
            currentX = event.touches[0].clientX;
            // Always prevent default on touchmove for Chrome
            event.preventDefault();
          } else {
            currentX = event.clientX;
          }

          const deltaX = (currentX - startX) * pxToVw;
          dragDelta = deltaX;
          currentTranslate = prevTranslate + deltaX;
          slidesContainer.style.transform = `translateX(${currentTranslate}vw)`;
        }

        function handleDragEnd(event) {
          if (!isDragging) return;
          isDragging = false;
          slidesContainer.releasePointerCapture(event.pointerId);

          let endX;
          if (event.type === 'touchend') {
            endX = event.changedTouches[0].clientX;
          } else {
            endX = event.clientX;
          }

          const finalDelta = (endX - startX) * pxToVw;

          if (Math.abs(finalDelta) < dragThreshold) {
            if (event.type !== 'touchend') {
              const tappedEl = root.elementFromPoint(event.clientX, event.clientY);
              if (tappedEl) setTimeout(() => tappedEl.click(), 0);
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
          startAutoSlide();
        }

        function sendNavigateMessage(variable) {
          window.parent.postMessage({ type: 'TMA_NAVIGATE', payload: variable }, '*');
        }

        slidesData.forEach(slide => {
          const slideDiv = document.createElement('div');
          slideDiv.className = 'slide';
        
          let innerContent = document.createElement('div');
          innerContent.className = 'slide-content';
        

          if (slide.optionalHref) {
            const anchor = document.createElement('a');
            anchor.href = 'https://www.ambassadoribet.com/' + slide.optionalHref;
        
            anchor.addEventListener("click", (e) => {
              e.preventDefault();
              window.parent.postMessage({
                type: 'TMA_HREF',
                payload: 'https://www.ambassadoribet.com/' + slide.optionalHref
              }, '*');
            });
        
            anchor.appendChild(innerContent);
            innerContent = anchor;
          }
        

          innerContent.addEventListener("click", () => {
            sendNavigateMessage(slide.navigateVar);
          });
        
          const img = document.createElement('img');
          img.src = slide.image.url;
          img.alt = "Slide Image";
          img.loading = "lazy";
        
          const caption = document.createElement('div');
          // caption.className = 'slide-caption';
          // caption.textContent = slide.caption || "";
        
          innerContent.appendChild(img);
          innerContent.appendChild(caption);
          slideDiv.appendChild(innerContent);
          slidesContainer.appendChild(slideDiv);
        });
        

        slidesContainer.style.width = (slideWidth * totalSlides) + 'vw';
      
        const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

        if(isTouchDevice){
          slidesContainer.addEventListener('touchstart', handleDragStart, { passive: false });
          slidesContainer.addEventListener('touchmove', handleDragMove, { passive: false });
          slidesContainer.addEventListener('touchend', handleDragEnd);
          slidesContainer.addEventListener('touchcancel', handleDragEnd);
        } else {
          slidesContainer.addEventListener('pointerdown', handleDragStart, { passive: false });
          slidesContainer.addEventListener('pointermove', handleDragMove, { passive: false });
          slidesContainer.addEventListener('pointerup', handleDragEnd);
          slidesContainer.addEventListener('pointercancel', handleDragEnd);
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
      .catch(err => console.error('CMS fetch error:', err));
  }

  init();
})();
