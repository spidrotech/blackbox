const fs = require('fs');
const paths = [
  'C:/workspace/blackbox/frontend/src/app/quotes/new/page.tsx',
  'C:/workspace/blackbox/frontend/src/app/quotes/[id]/edit/page.tsx'
];

for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  let content = fs.readFileSync(path, 'utf8');

  // We find <CardTitle className="text-base">Apercu PDF</CardTitle>
  const target = '<CardTitle className="text-base">Apercu PDF</CardTitle>';
  
  const replacement = `<div className="flex items-center gap-3">
                        <CardTitle className="text-base">Aperçu PDF</CardTitle>
                        <button type="button" onClick={() => window.open('/settings?tab=documents&doc=entetes', '_blank')} className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1" title="Modifier l'en-tête et le pied de page du document">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Paramètres du PDF
                        </button>
                      </div>`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated", path);
  }
}
