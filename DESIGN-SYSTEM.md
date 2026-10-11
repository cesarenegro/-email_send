---
name: Architectural Precision & Editorial Luxury
colors:
  surface: '#fbf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#fbf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#eae8e5'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#3f4a3c'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f0ed'
  outline: '#6f7a6b'
  outline-variant: '#bfcab8'
  surface-tint: '#036e13'
  primary: '#036e13'
  on-primary: '#ffffff'
  primary-container: '#5cb855'
  on-primary-container: '#004507'
  inverse-primary: '#7edc74'
  secondary: '#5c5e63'
  on-secondary: '#ffffff'
  secondary-container: '#dedfe5'
  on-secondary-container: '#606368'
  tertiary: '#5c5f59'
  on-tertiary: '#ffffff'
  tertiary-container: '#a2a59e'
  on-tertiary-container: '#383b35'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#99f98d'
  primary-fixed-dim: '#7edc74'
  on-primary-fixed: '#002202'
  on-primary-fixed-variant: '#00530b'
  secondary-fixed: '#e1e2e8'
  secondary-fixed-dim: '#c5c6cc'
  on-secondary-fixed: '#191c20'
  on-secondary-fixed-variant: '#44474c'
  tertiary-fixed: '#e1e3db'
  tertiary-fixed-dim: '#c5c7c0'
  on-tertiary-fixed: '#191d18'
  on-tertiary-fixed-variant: '#444842'
  background: '#fbf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 30px
    fontWeight: '500'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  metric-num:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2.5rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

# Design System — ARKITECNA MAILER · Atelier Dispatch

**Nome del sistema:** Architectural Precision & Editorial Luxury
**Versione:** 1.0 — 11/10/2026, Asia/Makassar (UTC+8)

## 0. Fonti e metodo

Questo documento è costruito **solo** da tre fonti verificate:

| Sigla | Fonte | Cosa contiene |
|---|---|---|
| **[Y]** | Blocco YAML in testa al file `DESIGN.md` originale (riportato identico qui sopra) | Token macchina: colori, tipografia, raggi, spaziature |
| **[P]** | Testo descrittivo (prosa) del file `DESIGN.md` originale | Intenti, specifiche dei componenti, colori aggiuntivi non presenti in [Y] |
| **[S]** | Screenshot `screen.png` (570 × 1600 px) | Rendering reale della landing page; colori campionati pixel per pixel |

Regole adottate:
- Nessun valore è stato inventato. Ogni colore, misura e font proviene da [Y], [P] o [S].
- Dove [Y], [P] e [S] non concordano, il conflitto è **dichiarato** nella sezione 10 e la decisione è lasciata aperta nella sezione 11, con pro e contro.
- I rapporti di contrasto della sezione 9 sono **calcolati** con la formula di luminanza relativa WCAG 2.1, non stimati.

---

## 1. Principi del marchio [P]

Il sistema unisce l'eleganza di un atelier di architettura d'avanguardia all'efficienza di un motore di invio outbound. È pensato per studi di architettura, studi di interior design e designer industriali, e rifiuta l'aspetto "plastico" dei SaaS generici.

Due assi estetici:
- **Minimalismo editoriale caldo** — fondi avorio e sabbia che richiamano carta da schizzo non sbiancata, intonaco e lino grezzo.
- **Utilità chirurgica** — tipografia sans-serif geometrica per dati densi e controlli; un verde smeraldo usato solo come segnale operativo (metriche di consegna, stati attivi, azioni affermative).

Tono emotivo: sicurezza silenziosa, prestigio su misura, controllo senza sforzo, chiarezza strutturata.

---

## 2. Colori

### 2.1 Token di sistema [Y]

Ruoli semantici in stile Material. **Lo screenshot [S] usa questi valori** (vedi sezione 10).

| Token | Valore | Ruolo |
|---|---|---|
| `background` / `surface` / `surface-bright` | `#FBF9F6` | Fondo pagina |
| `surface-container-lowest` | `#FFFFFF` | Card e pannelli in primo piano |
| `surface-container-low` | `#F5F3F0` | Fondo card statistiche, footer, aree secondarie |
| `surface-container` | `#EFEEEB` | Bottone secondario, contenitori interni |
| `surface-container-high` | `#EAE8E5` | Contenitore livello alto |
| `surface-container-highest` / `surface-variant` | `#E4E2DF` | Contenitore livello massimo |
| `surface-dim` | `#DBDAD7` | Superficie attenuata |
| `on-surface` / `on-background` | `#1B1C1A` | Testo principale |
| `on-surface-variant` | `#3F4A3C` | Testo su superfici varianti |
| `inverse-surface` | `#30312F` | Superficie scura (bottone primario nello screenshot) |
| `inverse-on-surface` | `#F2F0ED` | Testo su superficie scura |
| `outline` | `#6F7A6B` | Contorni |
| `outline-variant` | `#BFCAB8` | Contorni leggeri |
| `primary` / `surface-tint` | `#036E13` | Verde primario scuro |
| `on-primary` | `#FFFFFF` | Testo su primary |
| `primary-container` | `#5CB855` | Verde smeraldo operativo (CTA verdi, badge, barre) |
| `on-primary-container` | `#004507` | Testo su primary-container |
| `inverse-primary` / `primary-fixed-dim` | `#7EDC74` | Verde chiaro |
| `primary-fixed` | `#99F98D` | Verde fisso |
| `on-primary-fixed` | `#002202` | Testo su primary-fixed |
| `on-primary-fixed-variant` | `#00530B` | Variante testo su primary-fixed |
| `secondary` | `#5C5E63` | Secondario |
| `on-secondary` | `#FFFFFF` | Testo su secondario |
| `secondary-container` | `#DEDFE5` | Contenitore secondario |
| `on-secondary-container` | `#606368` | Testo su contenitore secondario |
| `secondary-fixed` / `secondary-fixed-dim` | `#E1E2E8` / `#C5C6CC` | Secondario fisso |
| `on-secondary-fixed` / `on-secondary-fixed-variant` | `#191C20` / `#44474C` | Testo su secondario fisso |
| `tertiary` | `#5C5F59` | Terziario |
| `on-tertiary` | `#FFFFFF` | Testo su terziario |
| `tertiary-container` | `#A2A59E` | Contenitore terziario |
| `on-tertiary-container` | `#383B35` | Testo su contenitore terziario |
| `tertiary-fixed` / `tertiary-fixed-dim` | `#E1E3DB` / `#C5C7C0` | Terziario fisso |
| `on-tertiary-fixed` / `on-tertiary-fixed-variant` | `#191D18` / `#444842` | Testo su terziario fisso |
| `error` | `#BA1A1A` | Errore |
| `on-error` | `#FFFFFF` | Testo su errore |
| `error-container` | `#FFDAD6` | Contenitore errore |
| `on-error-container` | `#93000A` | Testo su contenitore errore |

### 2.2 Palette descritta nella prosa [P]

Valori dichiarati nel testo di `DESIGN.md`. **Non coincidono** con i token [Y] (vedi sezione 10).

| Gruppo | Uso | Valore |
|---|---|---|
| Superfici | Fondo base (avorio pergamena) | `#FAF8F5` |
| | Card / contenitore in primo piano (alabastro) | `#FFFFFF` |
| | Riempimento input e tag secondari (arenaria) | `#F3F1EC` |
| Struttura | Linee divisorie standard | `#E5E5E0` |
| | Contorno attivo / focus (ossidiana) | `#111418` |
| Inchiostro | Titoli e testo principale (ossidiana) | `#111418` |
| | Testo secondario (ardesia) | `#525866` |
| | Etichette terziarie / metadati (cemento) | `#8A8D86` |
| Accenti e stati | Accento attivo primario (smeraldo) | `#5CB855` |
| | Velo smeraldo (fondo badge attivi, metriche positive) | `#ECF8EB` |
| | Avviso / bozza (terracotta ambra) | `#E67E22` |
| | Errore / invio fallito (carminio) | `#D9383A` |

### 2.3 Colori usati solo nelle specifiche dei componenti [P]

| Valore | Dove |
|---|---|
| `#2D3139` | Hover del bottone primario |
| `#4FA649` | Hover del bottone smeraldo |
| `#EAE8E2` | Hover del bottone ghost |
| `#DCDCD6` | Bordo dei campi di testo |
| `#F7F6F2` | Fondo riga di intestazione tabella |
| `#EFEFEA` | Bordo inferiore righe tabella; fondo dei tab segmentati |
| `#FAFAF8` | Hover righe tabella |
| `#2E7D32` | Testo badge "Active / Synchronized" |
| `#F0F4FA` / `#1D4ED8` | Fondo / testo badge "Completed" |
| `#F5F5F3` | Fondo badge "Draft / In Review" |
| `#FFF7ED` / `#C2410C` | Fondo / testo badge "Paused / Pending" |

---

## 3. Tipografia [Y] + [P]

Due famiglie:
- **Playfair Display** (serif) — solo titoli di sezione ad alto impatto, titoli di dashboard, dichiarazioni di marca.
- **Plus Jakarta Sans** (sans-serif geometrico) — controlli, griglie dati, navigazione, sottotitoli, metriche.

| Token | Famiglia | Dimensione | Peso | Interlinea | Spaziatura lettere |
|---|---|---|---|---|---|
| `headline-xl` | Playfair Display | 40px | 600 | 48px | -0.02em |
| `headline-xl-mobile` | Playfair Display | 30px | 600 | 38px | -0.015em |
| `headline-lg` | Playfair Display | 30px | 500 | 38px | -0.015em |
| `headline-lg-mobile` | Playfair Display | 24px | 500 | 32px | -0.01em |
| `headline-md` | Plus Jakarta Sans | 20px | 600 | 28px | -0.01em |
| `title-sm` | Plus Jakarta Sans | 16px | 600 | 22px | -0.005em |
| `body-lg` | Plus Jakarta Sans | 15px | 400 | 24px | 0em |
| `body-md` | Plus Jakarta Sans | 13px | 400 | 20px | 0em |
| `label-md` | Plus Jakarta Sans | 12px | 600 | 16px | 0.04em |
| `label-sm` | Plus Jakarta Sans | 11px | 600 | 14px | 0.06em |
| `metric-num` | Plus Jakarta Sans | 26px | 700 | 32px | -0.02em |

Regole [P]:
- **Maiuscolo** riservato a micro-etichette, intestazioni di colonna e badge di stato, con spaziatura da +0.04em a +0.06em (richiamo ai timbri dei disegni tecnici).
- Valori numerici nelle tabelle: cifre tabellari allineate (Plus Jakarta Sans, peso 600).

Osservato in [S] ma **non documentato** in [Y] né in [P]:
- La citazione della sezione testimonianza usa un serif **corsivo**. Nessun token tipografico definisce il corsivo.
- I testi dei bottoni appaiono in **maiuscolo** (es. "RICHIEDI ACCESSO ESCLUSIVO"), in contrasto con la regola sul maiuscolo qui sopra. Vedi sezione 10.

---

## 4. Raggi di arrotondamento

| Token [Y] | Valore | Uso dichiarato in [P] |
|---|---|---|
| `sm` | 0.25rem (4px) | Nessun uso dichiarato |
| `DEFAULT` | 0.5rem (8px) | Bottoni, campi, select, toast (la prosa li chiama `rounded-md / 8px`) |
| `md` | 0.75rem (12px) | **Conflitto:** la prosa assegna a `rounded-md` 8px, il token vale 12px. Vedi sezione 10 |
| `lg` | 1rem (16px) | Card metriche, tabelle dati, moduli di anteprima invio |
| `xl` | 1.5rem (24px) | Card principali di panoramica, contenitori hero |
| `full` | 9999px | Badge di stato, tag, contatori destinatari, chip filtro |

La prosa cita `roundedness: 2`, valore che non è definito in nessun punto del file.

---

## 5. Spaziature e griglia [Y] + [P]

### 5.1 Scala di spaziatura (ritmo base 8 punti)

| Token | Valore |
|---|---|
| `space-xs` | 0.25rem (4px) |
| `space-sm` | 0.5rem (8px) |
| `space-md` | 1rem (16px) |
| `space-lg` | 1.5rem (24px) |
| `space-xl` | 2.5rem (40px) |
| `gutter` | 1.5rem (24px) |
| `gutter-sm` | 1rem (16px) |
| `margin` | 2.5rem (40px) |
| `margin-mobile` | 1.25rem (20px) |

Filosofia [P]: spazio ampio (`space-xl`) tra i contenitori strutturali di alto livello; spazio compatto (`space-xs`, `space-sm`) dentro i gruppi interattivi, per code di invio e log densi.

### 5.2 Griglia responsiva [P]

| Fascia | Colonne | Gutter | Margine esterno | Note |
|---|---|---|---|---|
| Desktop | 12 | 1.5rem (`gutter`) | 2.5rem (`margin`) | Larghezza massima 1440px, centrata |
| Tablet 768–1024px | 8 | 1rem (`gutter-sm`) | 1.5rem | Le card metriche passano da 4 colonne a griglia 2×2. Il margine 1.5rem non ha un token `margin-*` dedicato (coincide con `space-lg`) |
| Mobile < 768px | 4 | non specificato | 1.25rem (`margin-mobile`) | Le tabelle complesse diventano card scorrevoli o aree con scorrimento orizzontale |

---

## 6. Elevazione e profondità [P]

| Livello | Uso | Specifica |
|---|---|---|
| Tier 0 | Fondo continuo | `#FAF8F5` secondo [P]; `#FBF9F6` secondo [Y] e [S] |
| Tier 1 | Contenitori e tabelle | `#FFFFFF` con bordo `1px solid #E5E5E0` |
| Tier 2 | Popover, menu a tendina, cassetti flottanti | `box-shadow: 0 12px 32px -8px rgba(17, 20, 24, 0.06), 0 4px 12px -2px rgba(17, 20, 24, 0.03);` |

- Tutte le card, tabelle e contenitori di metriche hanno bordo `1px` `#E5E5E0`.
- Niente ombre marcate: solo diffusione ambientale a più strati.
- **Header globale** in vetro smerigliato: `background: rgba(250, 248, 245, 0.88); backdrop-filter: blur(12px);` con separatore inferiore `1px solid #E5E5E0`.

---

## 7. Componenti [P]

### 7.1 Bottoni

| Variante | Fondo | Testo | Bordo | Hover | Misure |
|---|---|---|---|---|---|
| Primario (CTA) | `#111418` | `#FFFFFF` | — | fondo `#2D3139`, transizione 150ms ease | altezza 42px, padding `0 20px`, raggio 8px, leggera luce interna |
| Smeraldo (azione affermativa) | `#5CB855` | `#FFFFFF` | — | fondo `#4FA649` | come primario |
| Secondario / contorno | `#FFFFFF` | `#111418` | `1px solid #E5E5E0` | fondo `#F3F1EC` | come primario |
| Ghost | trasparente | `#525866` | — | fondo `#EAE8E2` | padding `0 12px` |

Uso dello smeraldo: avvio di campagne live, risincronizzazioni, conferme positive.
**Attenzione accessibilità:** testo bianco su `#5CB855` = 2.49:1 (vedi sezione 9).

### 7.2 Badge e pillole di stato

Tutti: raggio `full`, testo `label-sm` maiuscolo.

| Stato | Fondo | Testo | Extra |
|---|---|---|---|
| Active / Synchronized | `#ECF8EB` | `#2E7D32` | Pallino pieno smeraldo 6px pulsante |
| Completed | `#F0F4FA` | `#1D4ED8` | — |
| Draft / In Review | `#F5F5F3` | `#525866` | — |
| Paused / Pending | `#FFF7ED` | `#C2410C` | — |

### 7.3 Tabelle e griglie

| Elemento | Specifica |
|---|---|
| Riga intestazione | Fondo `#F7F6F2`, bordo inferiore `1px solid #E5E5E0`; testo `label-sm` maiuscolo `#8A8D86`, allineato a sinistra; quantità con allineamento numerico tabellare |
| Righe dati | Altezza 56px, fondo `#FFFFFF`, bordo inferiore `1px solid #EFEFEA`; hover `#FAFAF8` |
| Colonne di telemetria | Consegnate, aperture, clic: cifre tabellari Plus Jakarta Sans peso 600 |

### 7.4 Card metriche

| Elemento | Specifica |
|---|---|
| Contenitore | Fondo `#FFFFFF`, bordo `1px solid #E5E5E0`, padding 20px, raggio 16px (`lg`) |
| Titolo | `label-sm` maiuscolo `#8A8D86` |
| Valore | `metric-num` (26px, 700) `#111418` |
| Indicatori di contesto | `#5CB855` per consegnato, `#D9383A` per rimbalzato |

### 7.5 Campi e controlli

| Elemento | Specifica |
|---|---|
| Campo di testo | Altezza 42px, fondo `#FFFFFF`, bordo `1px solid #DCDCD6`, raggio 8px, testo `body-md` `#111418` |
| Focus | Bordo `1px solid #111418` + `box-shadow: 0 0 0 2px rgba(17, 20, 24, 0.06)` |
| Menu a tendina / selettori | Come il campo di testo, con chevron ossidiana minimale |
| Tab segmentati | Contenitore a pillola incassato `#EFEFEA` con tab bianchi flottanti e ombra ambientale leggera |

### 7.6 Cornice di anteprima email

Anteprima in iframe racchiusa da bordo `#E5E5E0`, che simula viewport desktop e mobile, con cornice opaca avorio attorno al contenuto della newsletter.

---

## 8. Riferimento rapido CSS (valori della prosa [P])

Variabili ricavate **solo** dai valori della sezione 2.2 e 2.3. Da usare dopo aver chiuso la decisione D1 (sezione 11).

```css
:root {
  /* Superfici */
  --color-bg: #FAF8F5;
  --color-card: #FFFFFF;
  --color-input-fill: #F3F1EC;
  /* Struttura */
  --color-border: #E5E5E0;
  --color-border-input: #DCDCD6;
  --color-focus: #111418;
  /* Inchiostro */
  --color-ink: #111418;
  --color-ink-secondary: #525866;
  --color-ink-tertiary: #8A8D86;
  /* Accenti e stati */
  --color-accent: #5CB855;
  --color-accent-hover: #4FA649;
  --color-accent-wash: #ECF8EB;
  --color-warning: #E67E22;
  --color-error: #D9383A;
  /* Bottoni */
  --color-primary-hover: #2D3139;
  --color-ghost-hover: #EAE8E2;
  /* Tabelle */
  --color-table-header: #F7F6F2;
  --color-table-row-border: #EFEFEA;
  --color-table-row-hover: #FAFAF8;
  /* Font */
  --font-display: "Playfair Display", serif;
  --font-ui: "Plus Jakarta Sans", sans-serif;
  /* Raggi */
  --radius-sm: 0.25rem;
  --radius-default: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-full: 9999px;
  /* Spaziature */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;
  --gutter: 1.5rem;
  --gutter-sm: 1rem;
  --margin: 2.5rem;
  --margin-mobile: 1.25rem;
  /* Elevazione */
  --shadow-tier-2: 0 12px 32px -8px rgba(17, 20, 24, 0.06), 0 4px 12px -2px rgba(17, 20, 24, 0.03);
  --header-glass-bg: rgba(250, 248, 245, 0.88);
  --header-glass-blur: blur(12px);
  --focus-ring: 0 0 0 2px rgba(17, 20, 24, 0.06);
  --transition-button: 150ms ease;
}
```

---

## 9. Accessibilità — contrasti misurati

Soglie WCAG 2.1 livello AA (verificate su w3.org):
- **1.4.3 Contrasto minimo:** testo normale ≥ 4.5:1; testo grande ≥ 3:1. Testo grande = almeno 18pt (circa 24px) oppure 14pt grassetto (circa 18.5px). Le soglie non si arrotondano: 4.49:1 non passa.
- **1.4.11 Contrasto non testuale:** confini dei componenti dell'interfaccia ≥ 3:1 con i colori adiacenti, quando il bordo è l'unico indizio visivo che identifica il controllo. I controlli disabilitati sono esenti.

| Coppia (testo/elemento su fondo) | Uso | Rapporto | Esito AA |
|---|---|---|---|
| `#FFFFFF` su `#5CB855` | Testo bottone smeraldo | **2.49:1** | ❌ Non passa né testo normale né testo grande |
| `#FFFFFF` su `#4FA649` | Bottone smeraldo in hover | **3.05:1** | ⚠️ Passa solo per testo grande |
| `#5CB855` su `#FFFFFF` | Valore metrico "consegnato" | **2.49:1** | ❌ Non passa (anche a 26px peso 700 serve 3:1) |
| `#8A8D86` su `#FFFFFF` | Etichette terziarie su card (11–12px) | **3.37:1** | ❌ Non passa per testo normale |
| `#8A8D86` su `#FAF8F5` | Etichette terziarie su fondo | **3.18:1** | ❌ Non passa per testo normale |
| `#8A8D86` su `#F7F6F2` | Intestazioni tabella | **3.11:1** | ❌ Non passa per testo normale |
| `#E67E22` su `#FFFFFF` | Avviso, se usato come testo | **2.85:1** | ❌ Non passa |
| `#DCDCD6` su `#FFFFFF` | Bordo campo di testo | **1.38:1** | ❌ Non passa 1.4.11 se il bordo è l'unico indizio |
| `#E5E5E0` su `#FFFFFF` / `#FAF8F5` | Bordi decorativi di card | 1.26:1 / 1.19:1 | Non applicabile se puramente decorativi |
| `#FFFFFF` su `#111418` | Bottone primario | 18.47:1 | ✅ |
| `#FFFFFF` su `#2D3139` | Bottone primario hover | 13.04:1 | ✅ |
| `#111418` su `#FAF8F5` | Testo principale | 17.42:1 | ✅ |
| `#525866` su `#FFFFFF` | Testo secondario | 7.13:1 | ✅ |
| `#525866` su `#FAF8F5` | Testo secondario su fondo | 6.72:1 | ✅ |
| `#D9383A` su `#FFFFFF` | Valore metrico "rimbalzato" | 4.59:1 | ✅ |
| `#2E7D32` su `#ECF8EB` | Badge Active | 4.69:1 | ✅ |
| `#1D4ED8` su `#F0F4FA` | Badge Completed | 6.07:1 | ✅ |
| `#525866` su `#F5F5F3` | Badge Draft | 6.53:1 | ✅ |
| `#C2410C` su `#FFF7ED` | Badge Paused | 4.88:1 | ✅ |

---

## 10. Conflitti rilevati tra le fonti

Colori campionati dallo screenshot [S] (pixel più frequenti per area):

| Elemento | [P] prosa | [Y] token | [S] screenshot | Chi segue lo screenshot |
|---|---|---|---|---|
| Fondo pagina | `#FAF8F5` | `#FBF9F6` (`background`) | `#FBF9F6` | [Y] |
| Bottone primario scuro | `#111418` | `#30312F` (`inverse-surface`) | `#30312F` | [Y] |
| Bottone secondario | `#FFFFFF` + bordo `#E5E5E0` | `#EFEEEB` (`surface-container`) | `#EFEEEB` | [Y] |
| Fondo card statistiche e footer | `#FFFFFF` (card) | `#F5F3F0` (`surface-container-low`) | `#F5F3F0` | [Y] |
| Verde smeraldo | `#5CB855` | `#5CB855` (`primary-container`) | `#5CB855` | Tutti concordano |
| Colore `primary` | `#5CB855` | `#036E13` | — | Nome uguale, valore diverso |
| Testo principale | `#111418` | `#1B1C1A` (`on-surface`) | Non misurabile in modo affidabile (testo con anti-aliasing a 570px) | — |
| Errore | `#D9383A` | `#BA1A1A` | — | Nome uguale, valore diverso |
| Contorno / bordo | `#E5E5E0` | `#6F7A6B` (`outline`) | — | Nome uguale, valore diverso |
| Raggio `md` | 8px | 12px (0.75rem) | Non misurabile alla risoluzione dello screenshot | — |
| Maiuscolo | Solo micro-etichette, intestazioni tabella, badge | — | Anche nei bottoni | Lo screenshot viola la regola [P] |
| Corsivo serif | Non previsto | Non previsto | Presente nella citazione | Non documentato |

**Sintesi:** lo screenshot è generato dai token [Y]; la prosa [P] descrive una palette diversa con lo stesso nome. Chi implementa oggi riceve due verità.

---

## 11. Decisioni aperte

### D1 — Quale palette è la fonte di verità

| Opzione | Pro | Contro |
|---|---|---|
| **A. Token [Y]** (quello che lo screenshot già mostra) | Nessuna rilavorazione della pagina esistente; formato macchina già pronto | Va riscritta la prosa e tutte le specifiche dei componenti, che citano valori [P]; il bottone primario `#30312F` è meno scuro dell'ossidiana descritta |
| **B. Valori [P]** (prosa) | Specifiche dei componenti già complete e coerenti tra loro; resa più contrastata | Va riscritto il blocco [Y] e rigenerato il rendering; i token Material perdono la loro logica di derivazione |
| **C. Due livelli**: [Y] come fondazione, [P] come alias dei componenti | Conserva entrambe le fonti | Due valori quasi identici per lo stesso ruolo (`#FAF8F5` vs `#FBF9F6`), rischio di errori del coder |

Alternativa non analizzata: ricavare una nuova palette unica da zero (richiederebbe nuovi valori, quindi fuori dal perimetro di questo documento).

### D2 — Testo sul bottone smeraldo (2.49:1)

| Opzione | Contrasto | Pro | Contro |
|---|---|---|---|
| A. Testo `#111418` su `#5CB855` | 7.42:1 ✅ | Mantiene il verde identitario | Cambia la percezione del bottone (testo scuro su verde) |
| B. Fondo `#036E13` (token `primary` [Y]) con testo bianco | 6.47:1 ✅ | Valore già esistente nel sistema | Verde molto più scuro, perde la vivacità "botanica" |
| C. Fondo `#2E7D32` (testo badge Active [P]) con testo bianco | 5.13:1 ✅ | Valore già esistente nel sistema | Verde intermedio, diverso da quello dello screenshot |
| D. Lasciare com'è | 2.49:1 ❌ | Nessuna modifica | Non conforme WCAG AA |

Alternativa non analizzata: un verde nuovo intermedio tra `#5CB855` e `#2E7D32` (non calcolato perché sarebbe un valore inventato).

### D3 — Etichette terziarie `#8A8D86` a 11–12px (3.11–3.37:1)

| Opzione | Contrasto | Pro | Contro |
|---|---|---|---|
| A. Usare `#525866` (testo secondario) | 7.13:1 su bianco, 6.59:1 su `#F7F6F2` ✅ | Valore già esistente | Si perde un livello di gerarchia cromatica (terziario = secondario) |
| B. Usare `#6F7A6B` (`outline` [Y]) | 4.49:1 su bianco ❌ (soglia 4.5 non arrotondabile) | Valore già esistente, tono più chiaro | Non passa per 0.01 |
| C. Lasciare com'è | ❌ | Nessuna modifica | Non conforme per le micro-etichette |

### D4 — Bordo dei campi di testo `#DCDCD6` (1.38:1)

| Opzione | Pro | Contro |
|---|---|---|
| A. Bordo `#8A8D86` (3.37:1 su bianco ✅) | Valore già esistente; conforme 1.4.11 | Campi visivamente più marcati, meno "eterei" |
| B. Tenere `#DCDCD6` e affiancare un altro indizio visivo (etichetta visibile sopra ogni campo) | Mantiene l'estetica | Secondo la pagina W3C l'esenzione vale solo se l'altro indizio identifica davvero il controllo: va verificato campo per campo |

### D5 — Nome del raggio a 8px

| Opzione | Pro | Contro |
|---|---|---|
| A. Bottoni e campi usano `DEFAULT` (8px); `md` resta 12px | Nessun valore cambia | Va corretta la prosa che dice `rounded-md / 8px` |
| B. Portare `md` a 8px | La prosa resta valida | `md` coincide con `DEFAULT`; un token diventa inutile |

### D6 — Maiuscolo nei bottoni

| Opzione | Pro | Contro |
|---|---|---|
| A. Bottoni in maiuscolo, aggiornare la regola [P] | Allinea la documentazione allo screenshot | Indebolisce la regola "maiuscolo solo per micro-etichette" |
| B. Bottoni in tondo (maiuscola iniziale), aggiornare il rendering | Coerente con la regola [P] | Va rifatta la pagina |

---

## 12. Fonti esterne

- WCAG 2.1, Understanding 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- WCAG 2.1, Understanding 1.4.11 Non-text Contrast: https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html
