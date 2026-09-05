// Each run has its own repeatable challenges. Rendering never consumes simulation randomness.
export function challengeSequence(seed:number,id:number,length:number,range=4){
  let n=(seed^Math.imul(id+1,0x9e3779b1))>>>0;
  return Array.from({length},()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return Math.floor(n/4294967296*range);});
}
export const COMEBACKS=[
  '„Die Warteschleife kennt inzwischen meinen Lebenslauf.“',
  '„Mein Mainframe hat weniger Ausreden. Und der ist von 1987.“',
  '„Router neu starten? Der hat öfter Urlaub als ich!“',
  '„Ich halte die Leitung. Aber nicht mehr meine Rede.“',
  '„Ich möchte mit dem REXX-Skript hinter dieser Ansage sprechen.“',
  '„Sie haben die Leitung. Ich habe die Erfahrung.“',
];
export const HOTLINE_LINES=['„Sie sind uns wirklich wichtig.“','„Ich muss kurz einen Kollegen fragen.“','„Das Problem ist uns noch nicht bekannt.“','„Haben Sie es mit Warten versucht?“','„Ich verbinde Sie mit der nächsten Warteschleife.“','„Das müsste eigentlich funktionieren.“'];
