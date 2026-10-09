export function copyTextToClipboard(
  text: string,
  onSuccess?: () => void,
  onError?: () => void
): void {
  if (!text) return;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      onSuccess?.();
    }).catch(() => {
      fallbackCopy(text, onSuccess, onError);
    });
  } else {
    fallbackCopy(text, onSuccess, onError);
  }
}

function fallbackCopy(text: string, onSuccess?: () => void, onError?: () => void): void {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    onSuccess?.();
  } catch {
    onError?.();
  }
}
