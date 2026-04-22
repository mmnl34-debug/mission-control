# Slack workspace voor het multi-agent team — setup in 7 stappen

Deze guide leidt je stap voor stap door het opzetten van de Slack-workspace waar jouw hele team (orchestrator → 4 managers → 52 specialisten + brein-kanaal) in leeft. Na afloop kun je vanaf mobiel/desktop in elk kanaal direct opdrachten geven.

**Totaal geschatte tijd: 10 minuten.**

\---

## Stap 1 — Slack workspace aanmaken (als je er nog geen hebt)

Alleen doen als je nog geen bestaande werkplek wilt gebruiken.

1. Ga naar [**https://slack.com/create**](https://slack.com/create)
2. Vul je e-mailadres in → klik de bevestigingscode
3. Geef de workspace een naam, bijv. `Helix Control` of `Gertjan AI Team`
4. Sla "Teamgenoten uitnodigen" over (jij bent voorlopig alleen)
5. Je komt terecht in je nieuwe workspace → je ziet de sidebar links.

Heb je al een workspace waar je dit in wilt? Ga dan direct naar stap 2.

**✅ Klaar wanneer:** je staat ingelogd in Slack met je nieuwe of bestaande workspace.

\---

## Stap 2 — Slack-app installeren (1-klik manifest)

1. Ga naar [**https://api.slack.com/apps**](https://api.slack.com/apps)
2. Klik rechtsboven op **"Create New App"** → kies **"From a manifest"**
3. Kies je workspace → klik **Next**
4. Er verschijnt een groot JSON-venster. **Verwijder alles wat erin staat.**
5. Open in dit project het bestand **`slack-app-manifest.json`** (in de projectroot) → kopieer de hele inhoud → plak in het venster
6. In het manifest staan drie regels met `REPLACE\_WITH\_YOUR\_DOMAIN`. Dit moet jouw productie-domein worden waar Mission Control op draait.

   * **Weet je dit al?** Vervang alle drie vóór plakken, bijv. naar `mission-control.vercel.app`.
   * **Weet je dit niet?** Laat het nu even staan — we fiksen het in stap 5 na de Vercel-deploy.
7. Klik **Next** → **Create**
8. Je komt op de app-pagina met de naam "Mission Control".
9. Ga in de linkerbalk naar **"Install App"** → klik **"Install to Workspace"** → **"Allow"**

**✅ Klaar wanneer:** je bent terug op de app-pagina en je ziet een **Bot User OAuth Token** beginnend met `xoxb-...`

\---

## Stap 3 — Tokens verzamelen

Je hebt drie waardes nodig. Hou Slack open in één tabblad.

1. **SLACK\_BOT\_TOKEN** — op de pagina "Install App" → kopieer **Bot User OAuth Token** (`xoxb-…`)
2. **SLACK\_SIGNING\_SECRET** — links in het menu naar **"Basic Information"** → scroll naar "App Credentials" → klik **Show** naast **Signing Secret** → kopieer
3. **SLACK\_PROVISION\_TOKEN** — dit verzin je zélf. Gebruik een willekeurige string (min. 24 tekens). Dit is alleen een extra slot op het /api/slack/provision endpoint zodat niemand anders je kanalen kan aanmaken.

Bewaar ze heel even in een notitie.

**✅ Klaar wanneer:** je hebt drie waardes geplakt in een notitie (`xoxb-...`, de signing secret, en je eigen provision-token).

\---

## Stap 4 — Anthropic API key (voor de agents)

Elke agent gebruikt Claude via de Anthropic API. Je hebt één key nodig.

1. Ga naar [**https://console.anthropic.com/settings/keys**](https://console.anthropic.com/settings/keys)
2. Log in (of maak een account — heb je waarschijnlijk al)
3. Klik **Create Key** → geef hem een naam zoals `slack-multiagent`
4. Kopieer de key (begint met `sk-ant-…`)

**✅ Klaar wanneer:** je hebt `ANTHROPIC\_API\_KEY` in je notitie staan.

\---

## Stap 5 — Env-vars in Vercel zetten en deployen

Mission Control draait op Vercel. We zetten de 4 variabelen daar, zodat Slack kan praten met jouw agents.

1. Ga naar [**https://vercel.com/dashboard**](https://vercel.com/dashboard)
2. Klik op het project **mission-control**
3. Ga naar **Settings → Environment Variables**
4. Voeg toe (één voor één, environment = Production + Preview + Development):

   * `SLACK\_BOT\_TOKEN` = `xoxb-…`
   * `SLACK\_SIGNING\_SECRET` = (signing secret)
   * `SLACK\_PROVISION\_TOKEN` = (je zelf-gekozen string)
   * `ANTHROPIC\_API\_KEY` = `sk-ant-…`
5. Klik **Save** na elke
6. Ga naar **Deployments** → klik "⋯" bij de laatste deploy → **Redeploy** (zonder cache) → wacht tot 'Ready'

Als je nog niet wist wat je domein is, is dat nu zichtbaar onder het project, bijv. `mission-control.vercel.app`.

**Terug naar Slack om het manifest af te maken (alleen als je in stap 2 `REPLACE\_WITH\_YOUR\_DOMAIN` hebt laten staan):**

1. [https://api.slack.com/apps](https://api.slack.com/apps) → jouw app
2. Links **App Manifest** → vervang de 3× `REPLACE\_WITH\_YOUR\_DOMAIN` door je Vercel-domein (zonder `https://`, alleen de host)
3. Save Changes
4. Links **Event Subscriptions** → check dat "Request URL" nu een groene vink laat zien (Slack test hem live). Zo niet: klik "Retry". Werkt alsnog niet? Check stap 5.1 — is de env var écht opgeslagen in Vercel en opnieuw gedeployed?
5. Links **Reinstall App** als Slack daar om vraagt.

**✅ Klaar wanneer:** Slack zegt "Verified" bij de Request URL, en de laatste Vercel-deploy is Ready.

\---

## Stap 6 — Alle 58 kanalen in één klap aanmaken

Nu de magie: één keer een POST naar `/api/slack/provision` en alle kanalen staan.

**Vanaf je terminal (Tabby / VS Code terminal):**

```bash
curl -X POST "https://JOUW-DOMEIN/api/slack/provision" \\
  -H "x-provision-token: JOUW\_PROVISION\_TOKEN"
```

Vervang:

* `JOUW-DOMEIN` door het Vercel-domein (bijv. `mission-control.vercel.app`)
* `JOUW\_PROVISION\_TOKEN` door de waarde die je in stap 3 hebt gekozen

Je krijgt een JSON terug:

```json
{"ok": true, "created": \["orchestrator", "brein", "agent-mgr-webdesign", ...], "skipped": \[], "errors": \[]}
```

**Meteen daarna** zie je in Slack de nieuwe kanalen in je sidebar verschijnen. Ze heten:

* `#orchestrator` — jouw eerste stop, voor opdrachten die nog verdeeld moeten worden
* `#brein` — centraal kanaal waar context gedeeld wordt
* `#agent-mgr-webdesign`, `#agent-mgr-social`, `#agent-mgr-ad`, `#agent-mgr-crm` — de 4 managers
* `#agent-wd-research`, `#agent-ad-seo`, `#agent-em-copywriter`, ... — de 52 specialisten

**✅ Klaar wanneer:** in Slack staan \~58 nieuwe kanalen in je sidebar (als `skipped` niet leeg is: die bestonden al, geen probleem).

\---

## Stap 7 — Notificaties op desktop en mobiel

Zodat je meldingen krijgt zonder Slack open te hoeven hebben.

### Mobiel (iOS/Android)

1. Installeer de Slack-app uit de App Store / Play Store
2. Log in op je workspace
3. Tik op je profiel rechtsonder → **Notifications** → zet op **All new messages**
4. Voor minder ruis: per kanaal kun je kiezen `Only mentions` — handig voor de specialisten-kanalen. Voor `#orchestrator` en managers: laat op `All` staan.

### Desktop (Mac/Windows/Linux)

1. Installeer Slack Desktop: [https://slack.com/downloads](https://slack.com/downloads)
2. Log in → **Preferences → Notifications**
3. **Notify me about…** = `All new messages` (of `Direct messages, mentions \& keywords`)
4. Zorg dat "Badge the Slack icon" aan staat

### (Optioneel) niet gestoord worden 's nachts

Preferences → Notifications → **Do not disturb** → stel een schema in.

**✅ Klaar wanneer:** je krijgt een push/notificatie zodra een agent iets post.

\---

## Hoe je het gebruikt

### Van de bank opdracht geven

Open Slack op je telefoon → ga naar **`#orchestrator`** → typ je opdracht:

> "Maak een campagne-opzet voor een lokale fotograaf die bruiloften schiet, focus op Meta + Google."

De orchestrator antwoordt in dezelfde thread en zet de taak door naar `#agent-mgr-ad`. In dat kanaal zie je de manager aan het werk gaan, die op zijn beurt specialisten inschakelt (`ad-research`, `ad-copywriter`, ...). Je volgt het in real-time.

### Direct naar een specialist

Ga direct naar **`#agent-ad-seo`** en typ een vraag. Je krijgt meteen antwoord van die specialist zonder omweg.

### Slash-commands

* `/agents` — krijg de volledige lijst
* `/agent mgr-ad` — info over één specifieke agent

\---

## Troubleshooting

**Probleem:** Slack zegt "dispatch\_failed" of "Your URL didn't respond".

* Check of je Vercel-deploy 'Ready' is
* Check of alle 4 env vars écht zijn gezet
* Kijk in Vercel **Logs** voor `/api/slack/events` wat er misgaat

**Probleem:** agent antwoordt niet in een kanaal.

* Is de bot in het kanaal? → typ `/invite @Mission Control` in het kanaal
* Standaard staat `chat:write.public` in het manifest waardoor de bot overal mag posten, maar sommige private-kanalen vereisen alsnog een invite.

**Probleem:** `curl /api/slack/provision` geeft 401.

* `x-provision-token` header moet exact gelijk zijn aan `SLACK\_PROVISION\_TOKEN` env var in Vercel.

**Probleem:** agent-antwoord komt in het verkeerde kanaal.

* Router mapt `agent-<key>` kanalen op de bijbehorende agent. Kanaalnaam `agent-mgr-ad` → `mgr-ad`-agent. Hernoemen van kanalen in Slack breekt deze mapping — beter niet doen.

\---

## Wat deze setup NIET doet (nog)

* Kan Claude Code sessies spawnen op jouw machine. (Daarvoor is de lokale mempalace-bridge; zit op de roadmap in het Slack-project op Mission Control.)
* Kan bestanden uploaden/downloaden. Slack-upload zit niet in dit MVP.
* Heeft geen eigen geheugen per thread; elke Slack-vraag is stateless qua context. Lange conversaties binnen één thread worden door Slack gebundeld, maar de agent ziet alleen het laatste bericht. (Roadmap.)

