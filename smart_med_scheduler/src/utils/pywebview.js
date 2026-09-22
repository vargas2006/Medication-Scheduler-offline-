/**
 * Helper to call pywebview Python API asynchronously.
 * Waits for pywebviewready event if pywebview is initializing.
 */
export async function callApi(funcName, ...args) {
  if (typeof window !== 'undefined' && window.pywebview && window.pywebview.api) {
    if (typeof window.pywebview.api[funcName] === 'function') {
      return await window.pywebview.api[funcName](...args);
    }
  }

  // If pywebview isn't ready yet, wait up to 2 seconds for event
  return new Promise((resolve) => {
    const handleReady = async () => {
      window.removeEventListener('pywebviewready', handleReady);
      if (window.pywebview && window.pywebview.api && typeof window.pywebview.api[funcName] === 'function') {
        const res = await window.pywebview.api[funcName](...args);
        resolve(res);
      } else {
        resolve({ success: false, error: 'pywebview API not available' });
      }
    };

    window.addEventListener('pywebviewready', handleReady);

    setTimeout(() => {
      window.removeEventListener('pywebviewready', handleReady);
      if (window.pywebview && window.pywebview.api && typeof window.pywebview.api[funcName] === 'function') {
        window.pywebview.api[funcName](...args).then(resolve);
      } else {
        // Fallback for browser dev mode
        console.warn(`[pywebview mock] Called ${funcName} with args:`, args);
        resolve({ success: false, message: "Mock API mode", error: "No backend API" });
      }
    }, 500);
  });
}
