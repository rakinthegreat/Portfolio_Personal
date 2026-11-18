import './resume.css';

const go = () => print();
document.querySelector('[data-print]')?.addEventListener('click', go);
if (new URLSearchParams(location.search).has('print')) addEventListener('load', () => setTimeout(go, 300));
