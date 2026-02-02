/*
  Sistema de Escalas - Sanitização HTML
  Versão: 1.0
  
  Previne ataques XSS escapando caracteres especiais HTML
*/

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} str - String a ser sanitizada
 * @returns {string} String segura para innerHTML
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
