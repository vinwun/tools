import './style.css'
import { LOCALE_SELECT_ID, renderDashboard } from './dashboard/render'
import {initLocale, persistLocale, resolveInitialLocale} from "./i18n/manager.ts";
import {hasLocale, type Locale} from "./i18n";

const app = document.querySelector<HTMLDivElement>('#app')
let currentLocale: Locale = resolveInitialLocale()

const mount = () => {
  if (!app) return

  initLocale(currentLocale)
  app.innerHTML = renderDashboard(currentLocale)

  const localeSelector = document.querySelector<HTMLSelectElement>(`#${LOCALE_SELECT_ID}`)
  if (!localeSelector) return

  localeSelector.addEventListener('change', (event) => {
    const selectedLocale = (event.target as HTMLSelectElement).value
    if (!hasLocale(selectedLocale)) return
    currentLocale = selectedLocale
    persistLocale(currentLocale)
    mount()
  })
}

mount()
