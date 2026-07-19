const adminEnglish = new Map();
const adminLabelEnglish = new Map();
let adminSpanish = localStorage.getItem('tournamentLanguage') === 'es';

const adminTranslations = {
  'Sign out': 'Cerrar sesión',
  'Private organizer access': 'Acceso privado para organizadores',
  'Use your organizer email to sign in. Your session stays signed in on this device.': 'Usa tu correo de organizador para iniciar sesión. Tu sesión permanecerá abierta en este dispositivo.',
  'Organizer email': 'Correo del organizador',
  'Send sign-in link': 'Enviar enlace de acceso',
  'Send sign-in link →': 'Enviar enlace de acceso →',
  'Player registrations': 'Registros de jugadores',
  'Expected money': 'Dinero esperado',
  'PLAYER REGISTRATIONS': 'REGISTROS DE JUGADORES',
  'TOURNAMENT INFO': 'INFORMACIÓN DEL TORNEO',
  'Date and time': 'Fecha y hora',
  'Location': 'Ubicación',
  'Rules (one rule per line)': 'Reglas (una por línea)',
  'Update': 'Actualización',
  'Save tournament info': 'Guardar información',
  'Remove all rules': 'Eliminar todas las reglas',
  'Clear all tournament info': 'Borrar toda la información',
  'COMMUNITY POSTS': 'PUBLICACIONES DE LA COMUNIDAD',
  'New post message': 'Mensaje de la nueva publicación',
  'Publish post': 'Publicar',
  'PUBLISHED POSTS': 'PUBLICACIONES PUBLICADAS',
  'Save': 'Guardar',
  'Delete': 'Eliminar',
  'Organizer team': 'Equipo organizador',
  'No registrations yet.': 'Aún no hay registros.',
  'No community posts yet.': 'Aún no hay publicaciones.'
};

function translateAdmin(root = document) {
  const brand = document.querySelector('.brand');
  if (brand) brand.innerHTML = adminSpanish
    ? 'CAMPEONATO <span>CENTENARIO</span>'
    : 'CENTENNIAL <span>CHAMPIONSHIP</span>';
  root.querySelectorAll('button, p, h2, h3, span').forEach(element => {
    if (!adminEnglish.has(element)) adminEnglish.set(element, element.textContent);
    const english = adminEnglish.get(element).trim();
    const translated = adminTranslations[english];
    if (adminSpanish && translated) element.textContent = translated;
    if (!adminSpanish && adminEnglish.has(element)) element.textContent = adminEnglish.get(element);
  });
  root.querySelectorAll('label').forEach(label => {
    const textNode = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    if (!textNode) return;
    if (!adminLabelEnglish.has(textNode)) adminLabelEnglish.set(textNode, textNode.nodeValue);
    const english = adminLabelEnglish.get(textNode).trim();
    textNode.nodeValue = adminSpanish && adminTranslations[english]
      ? adminTranslations[english]
      : adminLabelEnglish.get(textNode);
  });
  document.documentElement.lang = adminSpanish ? 'es' : 'en';
  document.title = adminSpanish
    ? 'Panel de organizadores | Campeonato Centenario'
    : 'Organizer Desk | Centennial Championship';
  document.querySelector('#adminLanguageButton').textContent = adminSpanish ? 'English' : 'Español';
}

document.querySelector('#adminLanguageButton').addEventListener('click', () => {
  adminSpanish = !adminSpanish;
  localStorage.setItem('tournamentLanguage', adminSpanish ? 'es' : 'en');
  translateAdmin();
});

window.translateAdmin = translateAdmin;
translateAdmin();
