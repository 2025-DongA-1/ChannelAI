import '@testing-library/jest-dom';

// jsdom이 지원하지 않는 DOM API 폴리필
window.HTMLElement.prototype.scrollIntoView = () => {};
