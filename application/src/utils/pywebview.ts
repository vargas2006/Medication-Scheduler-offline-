import { ApiResponse } from '../types';

export async function callApi<T = any>(funcName: string, ...args: any[]): Promise<ApiResponse<T>> {
  if (typeof window !== 'undefined' && window.pywebview && window.pywebview.api) {
    if (typeof window.pywebview.api[funcName] === 'function') {
      return await window.pywebview.api[funcName](...args);
    }
  }

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
        console.warn(`[pywebview mock] Called ${funcName} with args:`, args);
        resolve({ success: false, message: 'Mock API mode', error: 'No backend API' });
      }
    }, 500);
  });
}
