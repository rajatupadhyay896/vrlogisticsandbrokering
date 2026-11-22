import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import './styles.css';
import './light-theme.css';
import './setu.css';

const routes = [
  ['home','Home'], ['find-trucks','Find trucks'], ['find-loads','Find loads'],
  ['list-truck','List your truck'], ['post-load','Post a load'],
  ['driver','Driver updates'], ['broker','Broker desk']
] as const;

function Navigation({compact=false}:{compact?:boolean}) {
  const links=compact?routes.slice(1,5):routes;
  return <nav className={compact?'mobile-quick-nav':'site-nav'} id={compact?undefined:'nav'} aria-label={compact?'Quick freight actions':'Primary navigation'}>
    {links.map(([page,label])=><a key={page} href={'#'+page} data-page={page}>{label}</a>)}
  </nav>;
}
function Shell(){
  return <div className="site-wrap"><header className="site-header">
    <a className="setu-brand" data-page="home" href="#home" aria-label="Setu Logistics home"><img className="setu-mark" src="/setu-mark.svg" alt="" width="34" height="34"/><span>Setu Logistics</span></a>
    <Navigation/><div className="header-actions"><div className="language-switch" role="group" aria-label="Select website language">
      <button type="button" data-lang="en" lang="en">EN</button><button type="button" data-lang="hi" lang="hi">हिंदी</button></div>
      <button type="button" className="menu-btn" id="menu-toggle" aria-expanded="false" aria-controls="nav" aria-label="Toggle navigation">☰</button></div>
  </header><main id="app" aria-live="polite"/><Navigation compact/>
  <footer className="site-footer"><div className="footer-main"><strong>Setu Logistics</strong><div className="inline-actions"><a className="call-number" href="tel:+917738103505">+91 7738103505</a><a className="call-number" href="mailto:setulogistics@outlook.com">setulogistics@outlook.com</a></div></div></footer>
  <div id="toast" role="status" aria-live="polite"/></div>;
}
flushSync(()=>createRoot(document.getElementById('root')!).render(<Shell/>));
// Dialogs sit outside the inert background while a driver or broker form is open.
const modal=document.createElement('div'); modal.id='modal-root'; document.body.append(modal);
void import('./app');
