import React from 'react';
import {createRoot} from 'react-dom/client';
import Game from './src/Game';
import './app/globals.css';
import './src/style.css';

class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<main className="fatal-error"><h1>Hamid startet kurz neu.</h1><p>Das Spiel ist ins Stolpern gekommen. Lade die Seite neu, um wieder zu spielen.</p><button onClick={()=>location.reload()}>Neu laden</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><Game/></ErrorBoundary>);
