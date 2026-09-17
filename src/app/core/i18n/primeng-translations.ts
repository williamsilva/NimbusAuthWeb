import { Translation } from 'primeng/api';

import { NimbusLang } from './i18n.service';

/** Só as chaves do próprio PrimeNG que realmente aparecem na UI deste app (paginação/filtro de
 *  tabela, calendário se algum dia usar p-datepicker, mensagens de "sem resultado") - não é uma
 *  tradução completa das ~70 chaves de `Translation` (a maioria é rótulo de acessibilidade nunca
 *  visível aqui). `setTranslation()` faz merge com o default (inglês) do PrimeNG, então o que não
 *  é sobrescrito aqui continua em inglês - aceitável, são só aria-labels. */
export const PRIMENG_TRANSLATIONS: Record<NimbusLang, Partial<Translation>> = {
  'pt-BR': {
    accept: 'Sim',
    reject: 'Não',
    cancel: 'Cancelar',
    clear: 'Limpar',
    apply: 'Aplicar',
    choose: 'Escolher',
    upload: 'Enviar',
    today: 'Hoje',
    weekHeader: 'Sem',
    firstDayOfWeek: 0,
    dateFormat: 'dd/mm/yy',
    dayNames: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
    dayNamesShort: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    monthNames: [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ],
    monthNamesShort: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    emptyMessage: 'Nenhum resultado encontrado',
    emptyFilterMessage: 'Nenhum resultado encontrado',
    emptySearchMessage: 'Nenhum resultado encontrado',
    fileChosenMessage: 'arquivo(s)',
    noFileChosenMessage: 'Nenhum arquivo selecionado',
  },
  en: {
    accept: 'Yes',
    reject: 'No',
    cancel: 'Cancel',
    clear: 'Clear',
    apply: 'Apply',
    choose: 'Choose',
    upload: 'Upload',
    today: 'Today',
    weekHeader: 'Wk',
    firstDayOfWeek: 0,
    dateFormat: 'mm/dd/yy',
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    monthNames: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    emptyMessage: 'No results found',
    emptyFilterMessage: 'No results found',
    emptySearchMessage: 'No results found',
    fileChosenMessage: 'file(s)',
    noFileChosenMessage: 'No file chosen',
  },
  es: {
    accept: 'Sí',
    reject: 'No',
    cancel: 'Cancelar',
    clear: 'Limpiar',
    apply: 'Aplicar',
    choose: 'Elegir',
    upload: 'Subir',
    today: 'Hoy',
    weekHeader: 'Sem',
    firstDayOfWeek: 1,
    dateFormat: 'dd/mm/yy',
    dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    monthNames: [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ],
    monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    emptyMessage: 'No se encontraron resultados',
    emptyFilterMessage: 'No se encontraron resultados',
    emptySearchMessage: 'No se encontraron resultados',
    fileChosenMessage: 'archivo(s)',
    noFileChosenMessage: 'Ningún archivo seleccionado',
  },
};
