window.addEventListener('message', function (event) {
  if (event.origin !== 'https://usernamenotavailable12.github.io') return;

  const { type, payload } = event.data || {};

  if (type === 'TMA_NAVIGATE') {
    if (typeof TMA !== 'undefined' && typeof TMA.navigate === 'function') {
      TMA.navigate(payload);
      console.log(payload);
    } else {
      console.warn('TMA.navigate is not available in the parent window.');
    }
  }

  if (type === 'TMA_HREF') {
    window.location.href = payload;
  }
});
