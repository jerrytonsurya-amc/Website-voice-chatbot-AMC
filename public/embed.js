/**
 * Antara AI assist - Embed Script
 * Add this script to your website header to enable the voice chatbot.
 */

(function() {
  // CONFIGURATION
  const APP_URL = window.location.origin; // If hosted on the same domain, or replaces with specific URL
  // Note: For actual production use, replace window.location.origin with the actual hosted URL
  const WIDGET_URL = `${APP_URL}/?mode=widget`;

  // 1. Create Floating Button
  const btn = document.createElement('div');
  btn.id = 'antara-widget-trigger';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '64px',
    height: '64px',
    backgroundColor: '#050505',
    borderRadius: '24px',
    cursor: 'pointer',
    zIndex: '999999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  btn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  `;

  // 2. Create Iframe Container
  const container = document.createElement('div');
  container.id = 'antara-widget-container';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '104px',
    right: '24px',
    width: '380px',
    height: '520px',
    backgroundColor: '#050505',
    borderRadius: '32px',
    zIndex: '999998',
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'none',
    opacity: '0',
    transform: 'translateY(20px)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  const iframe = document.createElement('iframe');
  iframe.src = WIDGET_URL;
  iframe.allow = "microphone";
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
  });

  container.appendChild(iframe);

  function sendPageContext() {
    if (!iframe.contentWindow) return;
    iframe.contentWindow.postMessage({
      type: 'shriram-amc-context',
      context: {
        parentUrl: window.location.href,
        parentTitle: document.title,
        parentDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        parentPath: window.location.pathname,
      },
    }, '*');
  }

  iframe.addEventListener('load', sendPageContext);

  // 3. Logic
  let isOpen = false;
  btn.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      container.style.display = 'block';
      setTimeout(() => {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        btn.style.transform = 'rotate(90deg)';
        sendPageContext();
      }, 10);
    } else {
      container.style.opacity = '0';
      container.style.transform = 'translateY(20px)';
      btn.style.transform = 'rotate(0deg)';
      setTimeout(() => {
        container.style.display = 'none';
      }, 400);
    }
  };

  btn.onmouseenter = () => {
    if (!isOpen) btn.style.transform = 'translateY(-4px) scale(1.05)';
  };
  btn.onmouseleave = () => {
    if (!isOpen) btn.style.transform = 'translateY(0) scale(1)';
  };

  document.body.appendChild(btn);
  document.body.appendChild(container);
})();
