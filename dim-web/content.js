(function() {
  let overlay;
  
  function createOverlay() {
      if (document.getElementById('brightnessOverlay')) return;
  
      overlay = document.createElement('div');
      overlay.id = 'brightnessOverlay';
      Object.assign(overlay.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          backgroundColor: 'black',
          pointerEvents: 'none',
          zIndex: '999999',
          opacity: '0'
      });
      document.documentElement.appendChild(overlay);
  }
  
  chrome.runtime.onMessage.addListener((request) => {
      if (request.action === 'setBrightness') {
          if (!document.getElementById('brightnessOverlay')) {
              createOverlay();
          }
          overlay.style.opacity = (100 - request.brightness) / 100;
      }
  });
  
  // Initial creation
  createOverlay();
})();