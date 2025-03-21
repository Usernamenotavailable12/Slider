window.addEventListener('message', function (event) {
    if (event.origin !== 'https://usernamenotavailable12.github.io') return;
  
    if (event.data && event.data.type === 'TMA_NAVIGATE') {
      const target = event.data.payload;
      if (typeof TMA !== 'undefined' && typeof TMA.navigate === 'function') {
        TMA.navigate(target);
      } else {
        console.warn('TMA.navigate is not available in the parent window.');
      }
    }
  });
  