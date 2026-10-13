const getVoices = () => new Promise((resolve) => {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    resolve(voices);
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      resolve(window.speechSynthesis.getVoices());
    }, { once: true });
  }
});

export const speakText = async (text, language = 'en', { onStart, onEnd } = {}) => {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'en' ? 'en-US' : language;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;

  const voices = await getVoices();
  const samantha = voices.find(v => v.name === 'Samantha') || voices.find(v => v.name.includes('Samantha'));
  if (samantha) utterance.voice = samantha;

  window.speechSynthesis.speak(utterance);
};