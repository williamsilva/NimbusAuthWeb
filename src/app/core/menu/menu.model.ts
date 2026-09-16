/** Mesma forma de NimbusMenuItem (@williamsilva/nimbus-web-commons) - satisfeita por duck typing,
 *  sem `implements` (motivo documentado no arquivo da lib: cada app pode restringir os tipos de
 *  `labelKey`/`permissions` sem precisar adaptar nada). */
export interface AppMenuItem {
  labelKey: string;
  icon: string;
  activeIcon?: string;
  route?: string;
  externalUrl?: string;
  children?: AppMenuItem[];
  exact?: boolean;
  permissions?: string[];
  requireAll?: boolean;
}
