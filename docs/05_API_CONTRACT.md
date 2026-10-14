# 05 · API CONTRACT — Cloud Functions

| Campo | Valor |
|---|---|
| Versión | 2.0 · 08/10/2026 |
| Protocolo | Firebase **callable** (`onCall`, HTTPS POST `{ data }` → `{ result }`), región `europe-southwest1`, `enforceAppCheck: true` |
| Especificación formal | `openapi.yaml` (OpenAPI 3.1) en esta carpeta |
| Fuente de verdad en código | `packages/shared/src/schemas/<modulo>.ts` — **un esquema zod de entrada y uno de salida por callable**, con los nombres `XxxInput` / `XxxOutput` |

> **Para agentes de IA:** si añades o cambias una callable, actualiza en el mismo commit: el esquema zod, este documento, `openapi.yaml` y las pruebas. Nombres de callables en `camelCase` con verbo (`likeHome`). Las de administración empiezan por `admin`.

---

## 1. Convenciones

- **Entrada/salida** validadas con zod en servidor (`schema.parse`) y en cliente.
- **Fechas** de calendario `YYYY-MM-DD`; marcas de tiempo en salidas como **ISO 8601** (`string`). Importes en céntimos (`int`).
- **Paginación:** `{ cursor?: string, limit?: int (1–50, defecto 20) }` → `{ items, nextCursor: string | null }`.
- **Idempotencia:** las acciones que crean recursos aceptan `clientRequestId?: string (uuid)`; si se repite, devuelven el mismo resultado.
- **Errores:** `HttpsError(code, message, { code: AppErrorCode, fields?: Record<string,string>, meta?: object })`. El cliente muestra `t('errors.' + details.code)`.
- **Guardas** abreviadas: `A` autenticado · `EV` email verificado · `PV` teléfono verificado · `ID` identidad aprobada · `ACT` cuenta activa · `LEG` textos al día · `CO` ciudad propia abierta · `ADM` admin + 2FA · `SADM` superadmin + 2FA · `PUB` pública (sin sesión, con App Check).

---

## 2. Catálogo de callables

### 2.1 Cuenta y perfil (AUTH)

| Callable | Guardas | Entrada | Salida | Errores | Efectos |
|---|---|---|---|---|---|
| `completeSignup` | A | `{ firstName, lastName, birthDate, referralCode?, acceptedTerms: version, acceptedPrivacy: version }` | `{ me: Me }` | `E_UNDERAGE`, `E_LEGAL_VERSION`, `E_ALREADY_EXISTS`, `E_VALIDATION` (fecha futura o > 110 años) | Crea `users` (`onboarding.step = 2`), `publicProfiles`, `legalAcceptances` (TERMS, PRIVACY, IP /24), `referralCodes/{código propio}`; `referrals` si el código es válido (uno desconocido se ignora); si hay `waitlist` con ese email → `CONVERTED` + `users.waitlistPrefill`; encola N-02 |
| `getMe` | A | `{}` | `Me` (ver §4) | `E_NOT_FOUND` (cuenta de Auth sin `completeSignup`: el cliente muestra «Completa tu registro») | — |
| `updateProfile` | A, EV | `{ displayFirstName?, about?, languages?, travelsWith?, avatarPath? }` | `{ profile: PublicProfile }` | `E_TEXT_VIOLATION`, `E_VALIDATION` | Actualiza `publicProfiles` |
| `updateSettings` | A | `{ theme?: 'system'\|'light'\|'dark'\|'black', notifications?: { [MATCHES\|MESSAGES\|LIKES\|EXCHANGES\|REVIEWS]: { email?: bool, push?: bool } }, pushPreview?: bool }` | `{ ok: true }` | `E_VALIDATION` (incluye `SERVICE`/`LEGAL`, que no se pueden desactivar) | `users.settings` (una clave por categoría y canal, M8) |
| `confirmPhoneLinked` | A, EV | `{}` | `{ phoneVerified: true }` | `E_PHONE_NOT_LINKED`, `E_PHONE_NOT_ES` (solo móviles `+34 6/7…`) | Lee el teléfono de Auth, marca `phoneVerified`, guarda `phoneE164` y pasa el onboarding al paso 3 |
| `acceptLegalDocs` | A | `{ items: { slug, version }[] }` (slugs aceptables: `terminos`, `privacidad`, `normas-comunidad`) | `{ ok: true }` | `E_LEGAL_VERSION`, `E_VALIDATION` | `legalAcceptances`, `users.legal` |
| `requestAccountDeletion` | A (reautenticado < 5 min) | `{ confirm: 'ELIMINAR' }` | `{ purgeAt }` | `E_REAUTH_REQUIRED` | BR-29, cancela Stripe al fin de periodo, N-18 |
| `signOutEverywhere` | A (reautenticado: `auth_time` < 5 min) | `{}` | `{ ok: true }` | `E_REAUTH_REQUIRED` | Revoca los *refresh tokens*; N-27 |
| `registerPushToken` / `unregisterPushToken` | A | `{ token }` (20–4096) | `{ ok: true }` | `E_VALIDATION` | `users/{uid}/pushTokens/{sha256(token)}` (`token`, `platform`, `userAgent` ≤ 200, `createdAt`, `lastSeenAt`) |

### 2.2 Casa y preferencias (HOME, PREF)

| Callable | Guardas | Entrada | Salida | Errores | Efectos |
|---|---|---|---|---|---|
| `upsertHome` | A, EV, ACT | `HomeDraftInput` = `HomeInput` parcial con `cityId` obligatorio (borradores, AC-06.1) | `{ home: HomeOwnerView }` | `E_TEXT_VIOLATION` (`fields`), `E_VALIDATION`, `E_CITY_UNKNOWN` | Crea/actualiza `homes/{uid}`; si estaba `PUBLISHED` y cambia `cityId` → retención `CITY_CHANGE` (FR-65) y `locationCheck` a `NONE`; al completarse (BR-03) el onboarding pasa de 3 a 4 |
| `getMyHome` | A | `{}` | `{ home: HomeOwnerView }` | `E_NOT_FOUND` (aún no creada) | — |
| `reorderHomePhotos` | A, EV | `{ photoIds: string[] }` | `{ photos }` | `E_VALIDATION` | — |
| `deleteHomePhoto` | A, EV | `{ photoId }` | `{ photos }` | `E_PHOTOS_MIN` (si publicada y quedaría < 5) | Borra ficheros |
| `acceptDeclaration` | A, EV | `{ version }` | `{ home: HomeOwnerView }` | `E_LEGAL_VERSION` | `homes.declaration`, `legalAcceptances` |
| `publishHome` | A, EV, PV, ACT | `{}` | `{ home, visible: boolean, pendingReasons: VisibilityProblem[] }` (`NOT_PUBLISHED`, `IDENTITY`, `LOCATION`, `ON_HOLD`, `ACCOUNT`, `CITY`; BR-04) | `E_HOME_INCOMPLETE` (`meta.missing`), `E_DECLARATION_REQUIRED` | `status = PUBLISHED`, `publishedAt`; onboarding → paso 6 completado |
| `pauseHome` / `unpauseHome` | A, EV | `{}` | `{ home }` | `E_HOME_STATE` | — |
| `updateTravelPrefs` | A, EV | `{ destinations: { mode, cityIds }, availability: { windowIds, ranges }, travelers: { count, withPet } }` | `{ home }` | `E_VALIDATION`, `E_RANGE_INVALID` | Onboarding 4 → 5. El recálculo de `demandStats` lo hace el job J-08 (M9) |

### 2.3 Verificación (VER)

| Callable | Guardas | Entrada | Salida | Errores | Efectos |
|---|---|---|---|---|---|
| `submitIdentityVerification` | A, EV, PV, ACT | `{ tenure, propertyDocType, docNumber, files: { idFront, idBack, selfie, propertyDoc, landlordAuthorization? } }` (rutas `private/verifications/{uid}/{verificationId}/{clave}`; todas con el mismo `verificationId`, que es el id del documento) | `{ verificationId, status: 'PENDING' }` | `E_FILES_MISSING` (`meta.missing`; también si un fichero no se subió), `E_LANDLORD_AUTH_REQUIRED`, `E_VERIFICATION_PENDING`, `E_ALREADY_APPROVED`, `E_VALIDATION` (DNI/NIE con letra incorrecta o rutas ajenas) | Crea `verifications`, `docNumberHash` con *pepper* (no guarda el número), detecta duplicados (no bloquea: `duplicateOfUid` + alerta `VERIFICATION_DUPLICATE`), programa el borrado de los ficheros de un envío anterior |
| `getMyVerification` | A, EV | `{}` | `{ verification: MyVerification \| null }` (`status`, `tenure`, `propertyDocType`, `decisionReason`, `infoRequest`, fechas) | — | — (el propietario ya no lee `verifications` directamente: contiene el hash y posibles uids duplicados) |
| `adminListVerifications` | ADM | `{ status?, cursor?, limit? }` | `{ items: VerificationSummary[], nextCursor }` | — | — |
| `adminGetVerification` | ADM | `{ id }` | `{ verification, user, home, duplicateUser? }` | `E_NOT_FOUND` | Auditoría |
| `adminGetVerificationFileUrl` | ADM | `{ id, file: 'idFront'\|'idBack'\|'selfie'\|'propertyDoc'\|'landlordAuthorization' }` | `{ url, contentType, expiresAt }` (5 min; en el emulador `url` es `data:`) | `E_NOT_FOUND`, `E_FILES_PURGED` | **Auditoría obligatoria** |
| `adminDecideVerification` | ADM | `{ id, decision: 'APPROVE'\|'REJECT'\|'REQUEST_INFO', reason?, infoRequest?, fraudSuspicion? }` | `{ verification }` | `E_REASON_REQUIRED`, `E_STATE` | Estado de usuario, `filesPurgeAt`, fundador (BR-19), referido (BR-20), N-03/N-04/N-13, auditoría |

### 2.4 Ciudades y lista de espera (CITY)

| Callable | Guardas | Entrada | Salida | Errores |
|---|---|---|---|---|
| `joinWaitlist` | PUB | `{ email, cityId, destinations: string[] (1–P-23, sin la propia ciudad), windowIds: string[] (0–10, activas), acceptPrivacy: version }` | `{ ok: true }` (siempre igual, exista o no) | `E_VALIDATION`, `E_RATE_LIMIT` (10/h por IP), `E_CITY_UNKNOWN`, `E_LEGAL_VERSION` |
| `confirmWaitlist` | PUB | `{ token }` (43 car. base64url) | `{ cityId, position?: int }` (`position` solo en la primera confirmación; idempotente) | `E_TOKEN_INVALID` (desconocido o caducado: 7 días) |

Ciudades, ventanas y `demandStats` se leen directamente de Firestore (lectura pública).

`joinWaitlist` encola el email N-19 en `mailQueue`; el trigger `onMailQueued` lo envía (consola en emuladores). Un email ya confirmado no recibe nada y la respuesta es idéntica (sin enumeración).

### 2.5 Descubrir, Explorar, ficha (DISC)

| Callable | Guardas | Entrada | Salida | Errores |
|---|---|---|---|---|
| `getDiscoverDeck` | A, EV | `{ destinationCityIds?: string[], windowId?: string, excludeIds: string[] (≤ 200) }` | `{ cards: HomeCard[], canLike: boolean, blockers: Blocker[], likesRemaining: int \| null, sponsored: SponsoredCard \| null }` | — |
| `searchHomes` | A, EV | `{ filters: { cityIds?, windowId?, dateRange?, minGuests?, pets?, types?, amenities?, perfectFitOnly?, topOnly?, likedMeOnly?, minReviews? }, sort?: 'RELEVANCE'\|'NEWEST'\|'RATING', cursor?, limit? }` | `{ items: HomeCard[], nextCursor }` | `E_PREMIUM_REQUIRED` (filtros `topOnly`, `likedMeOnly`, `minReviews`) |
| `getHomeDetail` | A, EV | `{ homeId }` | `{ home: HomePublicView, host: PublicProfile, reviews: ReviewView[], relation: { liked: boolean, passed: boolean, matchId: string \| null }, compatibility: Compatibility }` | `E_NOT_FOUND` (también si hay bloqueo o no es visible) |

### 2.6 Me gusta y match (MATCH)

| Callable | Guardas | Entrada | Salida | Errores | Efectos |
|---|---|---|---|---|---|
| `likeHome` | A, EV, ID, ACT, LEG, CO | `{ homeId, message?: string (≤ P-40, solo Premium), clientRequestId? }` | `{ matched: boolean, matchId: string \| null, likesRemaining: int \| null }` | `E_LIKE_LIMIT` (`meta.resetsAt`), `E_RATE_LIMIT`, `E_NO_AVAILABILITY`, `E_HOME_NOT_PUBLISHED`, `E_NOT_FOUND`, `E_SELF_LIKE`, `E_PREMIUM_REQUIRED` (si hay `message`), `E_MESSAGE_LIMIT`, `E_TEXT_VIOLATION`, `E_ON_HOLD` | Transacción: contador, `likes`, si recíproco → `matches` (ID determinista) + N-07 a ambos + evento |
| `passHome` | A, EV | `{ homeId }` | `{ ok: true }` | — | `passes` con `expiresAt` |
| `undoPass` | A, EV | `{ homeId }` | `{ ok: true }` | `E_UNDO_LIMIT` (gratis: 1 por sesión, el cliente envía `sessionId`) | Borra `passes` |
| `listLikesReceived` | A, EV | `{ cursor?, limit? }` | `{ count: int, items: HomeCard[] \| null, withMessage: HomeCard[], nextCursor }` (`items = null` si no es Premium; `withMessage` = me gusta con mensaje, visibles también para gratis, FR-61). Solo me gusta aún sin match, de casas visibles y sin bloqueo | — | — |
| `markMatchSeen` | A | `{ matchId }` | `{ ok: true }` | `E_NOT_PARTICIPANT` | — |
| `unmatch` | A | `{ matchId }` | `{ ok: true }` | `E_NOT_PARTICIPANT`, `E_MATCH_INACTIVE` | BR-09 |

### 2.7 Contacto (CONT)

| Callable | Guardas | Entrada | Salida | Errores |
|---|---|---|---|---|
| `getMatchContact` | A, ACT | `{ matchId }` | `{ displayName, phoneE164, whatsappUrl }` (del otro, solo si lo compartió) | `E_NOT_PARTICIPANT`, `E_MATCH_INACTIVE`, `E_PHONE_NOT_SHARED` |
| `sharePhoneInChat` | A, ACT | `{ matchId }` | `{ ok: true }` | `E_NOT_PARTICIPANT`, `E_MATCH_INACTIVE` |

### 2.7b Chat (CHAT)

| Callable | Guardas | Entrada | Salida | Errores | Efectos |
|---|---|---|---|---|---|
| `sendMessage` | A, ACT | `{ matchId, text (1–P-28), clientRequestId (uuid) }` | `{ message: { id, createdAt, paymentWarning } }` | `E_NOT_PARTICIPANT`, `E_MATCH_INACTIVE`, `E_ON_HOLD`, `E_MESSAGE_TOO_LONG`, `E_RATE_LIMIT`, `E_VALIDATION` | Transacción: mensaje + `lastMessage` + `unread` del otro (+ `unreadSince` si era 0); después push N-20 (sin texto salvo `pushPreview`) y `pushedAt`; email resumen N-20 por J-13 si sigue sin leer a las 2 h y no hubo push (máx. 1 cada 6 h por chat) |
| `markConversationRead` | A | `{ matchId }` | `{ ok: true }` | `E_NOT_PARTICIPANT` | `unread[uid] = 0`, `lastReadAt[uid]` |
| `deleteMessageForMe` | A | `{ matchId, messageId }` | `{ ok: true }` | `E_NOT_PARTICIPANT` | Añade a `deletedFor` |

Los mensajes se leen en tiempo real desde Firestore (`matches/{id}/messages`, orden `createdAt desc`, `limit 50`), solo por los participantes y solo mientras el match está `ACTIVE` (M6). El id del mensaje es el `clientRequestId`. Si dos personas vuelven a hacer match tras deshacerlo, el nuevo match tiene id `{uidA}_{uidB}_{n}` para que la conversación anterior no reaparezca (BR-45). `sendMessage` se despliega con `minInstances: 1` para evitar arranques en frío.

### 2.8 Intercambios (EXCH)

| Callable | Guardas | Entrada | Salida | Errores | Efectos |
|---|---|---|---|---|---|
| `proposeExchange` | A, EV, ACT, LEG | `{ matchId, startDate, endDate, guests: { [uid]: 1–12 }, pets: { [uid]: 0–5 }, note? (≤ 300) }` — `guests` con exactamente los dos participantes (lo que cada uno lleva a la casa del otro) | `{ exchange: ExchangeView }` | `E_MATCH_INACTIVE`, `E_EXCHANGE_DATES`, `E_EXCHANGE_CAPACITY`, `E_EXCHANGE_PETS`, `E_EXCHANGE_PENDING_EXISTS`, `E_HOME_STATE`, `E_LEGAL_OUTDATED`, `E_NOT_PARTICIPANT`, `E_VALIDATION` | `exchanges` (`PROPOSED`, `expiresAt` = ahora + P-19), `matches.activeExchangeId`, mensaje de sistema `EXCHANGE_PROPOSED` (con `exchangeId`), N-08 a la otra parte (centro + email + push) |
| `respondExchange` | A, EV, ACT | `{ exchangeId, accept: boolean }` | `{ exchange }` | `E_NOT_PARTICIPANT`, `E_EXCHANGE_STATE` (no `PROPOSED` o caducada), `E_SELF_RESPONSE`, `E_MATCH_INACTIVE`, `E_EXCHANGE_DATES` (el inicio ya pasó) | `CONFIRMED` (o `DECLINED` y libera el match), mensaje de sistema, N-08 a quien propuso |
| `cancelExchange` | A, EV | `{ exchangeId, reason? (≤ 300) }` | `{ exchange }` | `E_EXCHANGE_STATE` (solo `PROPOSED` de quien la propuso o `CONFIRMED` antes del inicio), `E_NOT_PARTICIPANT` | `CANCELLED` (`cancelledBy`, `cancelReason`, sin sanción), libera el match, mensaje de sistema, N-08 |

`ExchangeView`: `{ id, matchId, participants, proposedBy, startDate, endDate, nights, guests, pets, note, status, expiresAt, confirmedAt, cancelledBy, cancelReason, completedAt, reviewDeadline }` (`reviewDeadline` = último día para valorar, `YYYY-MM-DD`). El cliente lee `exchanges/{id}` en tiempo real (solo participantes).

> M8: un solo intercambio abierto (`PROPOSED` o `CONFIRMED`) por match, porque `matches.activeExchangeId` es único; BR-15 solo exige una propuesta (10_DECISIONS §5). Jobs: J-01 caduca propuestas (N-08 `EXPIRED` a quien la propuso), J-02 completa tras `endDate` y abre valoraciones (N-10), J-06 envía N-09 tres días antes y N-10 a los 10 días.

### 2.9 Valoraciones (REV)

| Callable | Guardas | Entrada | Salida | Errores |
|---|---|---|---|---|
| `submitReview` | A, EV, ACT | `{ exchangeId, overall: 1–5, sub: { cleanliness, accuracy, communication, care }, comment? (≤ 1000) }` | `{ review: { id, status: 'PENDING'\|'PUBLISHED', publishedAt }, published: boolean }` | `E_REVIEW_WINDOW_CLOSED`, `E_REVIEW_EXISTS`, `E_EXCHANGE_STATE`, `E_TEXT_VIOLATION`, `E_NOT_PARTICIPANT` |

Doble ciego: la primera queda `PENDING` (solo la lee su autor); con la segunda se publican las dos. J-03 publica las pendientes al vencer el plazo. Cada publicación recalcula `homes.rating`, `homes.isTop` (BR-13) y `publicProfiles.ratingAvg/reviewsCount/isTopHost`, y envía N-11.

### 2.10 Premium (PREM)

| Callable | Guardas | Entrada | Salida | Errores |
|---|---|---|---|---|
| `createCheckoutSession` | A, EV, ACT | `{ plan: 'MONTHLY'\|'YEARLY', acceptImmediateStart: true }` | `{ url }` | `E_ALREADY_SUBSCRIBED`, `E_VALIDATION` |
| `createPortalSession` | A | `{}` | `{ url }` | `E_NO_SUBSCRIPTION` |
| `withdrawSubscription` | A (reautenticado: `auth_time` ≤ 5 min) | `{ confirm: true }` | `{ refundedCents, endedAt }` | `E_REAUTH_REQUIRED`, `E_WITHDRAWAL_EXPIRED`, `E_WITHDRAWAL_USED`, `E_NO_SUBSCRIPTION` |
| `devSimulateStripe` | A · **solo emulador** | `{ action: 'CANCEL_AT_PERIOD_END'\|'RESUME'\|'RENEW'\|'PAYMENT_FAILED'\|'END_PERIOD' }` | `{ ok: true }` | `E_NOT_FOUND` fuera del emulador |

> M7: `createCheckoutSession` guarda la aceptación `WITHDRAWAL_START` (art. 103 m TRLGDCU, texto PROVISIONAL) en `legalAcceptances`. En el emulador (sin `STRIPE_SECRET_KEY`) las sesiones de Checkout y Portal las sustituye una pasarela simulada: el checkout activa la suscripción al momento y devuelve `successUrl`; el portal abre `/app/premium/portal-simulado`, que llama a `devSimulateStripe` (10_DECISIONS §5, M7). El reembolso del desistimiento sigue P-07 (`FULL` por defecto, o prorrateado).

### 2.11 Crecimiento (GROW)

| Callable | Guardas | Entrada | Salida |
|---|---|---|---|
| `getReferralSummary` | A, EV | `{}` | `{ code, link, invited: { displayName, status: 'REGISTERED'\|'REWARDED'\|'INELIGIBLE', createdAt }[], rewardsThisYear, maxRewards, rewardDays }` |

### 2.12 Seguridad y moderación (SAFE)

| Callable | Guardas | Entrada | Salida | Errores |
|---|---|---|---|---|
| `blockUser` | A | `{ targetUid }` | `{ ok: true }` | `E_SELF_BLOCK` |
| `unblockUser` | A | `{ targetUid }` | `{ ok: true }` | `E_NOT_FOUND` |
| `listBlocked` | A | `{}` | `{ items: { uid, displayName, blockedAt }[] }` | — |
| `submitReport` | A, EV | `{ targetType: 'HOME'\|'USER'\|'REVIEW'\|'MESSAGE', targetId, reason: 'PHOTOS_NOT_OWN'\|'RUDE'\|'HARASSMENT'\|'INAPPROPRIATE_MESSAGES'\|'FRAUD'\|'HIDDEN_RENTAL'\|'ILLEGAL'\|'PERSONAL_DATA'\|'OTHER', description, attachmentPaths?, alsoBlock?: boolean }` | `{ reportId, priority, preventiveHold: boolean }` | `E_RATE_LIMIT`, `E_VALIDATION` | Alerta de admin (N-26) si prioridad alta; retención preventiva si BR-42; acuse N-14 |
| `submitPublicReport` | PUB | `{ name, email, targetUrl, description, goodFaith: true }` | `{ reportId }` | `E_RATE_LIMIT`, `E_VALIDATION` |
| `submitAppeal` | A | `{ actionId, text }` | `{ appealId }` | `E_APPEAL_WINDOW_CLOSED`, `E_APPEAL_EXISTS` |
| `adminListReports` | ADM | `{ status?, priority?, cursor?, limit? }` | `{ items, nextCursor }` | — |
| `adminGetReport` | ADM | `{ id }` | `{ report, targetUserHistory }` | `E_NOT_FOUND` |
| `adminModerate` | ADM | `{ reportId?, targetType, targetId, targetUid, action: 'DISMISS'\|'WARN'\|'HIDE_CONTENT'\|'HIDE_MESSAGE'\|'SUSPEND'\|'BAN'\|'RESTORE'\|'RELEASE_HOLD', recordStrike?: boolean, suspendedUntil?, statement: { templateId, facts, ground, groundDetail } }` | `{ actionId, strikesActive, suggestedNext: 'NONE'\|'SUSPEND'\|'BAN' }` | `E_STATEMENT_REQUIRED`, `E_VALIDATION` |
| `adminDecideAppeal` | ADM | `{ appealId, decision: 'UPHOLD'\|'REJECT', text }` | `{ appeal }` | `E_SAME_ADMIN` (si hay otro admin disponible, se advierte; no bloquea) |

### 2.12b Ubicación, fotos, ayuda y quejas

| Callable | Guardas | Entrada | Salida | Errores |
|---|---|---|---|---|
| `verifyHomeLocation` | A, EV, ACT | `{ lat, lng, accuracyM, isMobile }` | `{ result: 'PASS'\|'FAIL'\|'INACCURATE', distanceKm, attemptsLeft }` (precisión > 200 m → `INACCURATE` como resultado, cuenta como intento) | `E_LOCATION_ATTEMPTS` (5 al día, zona Madrid), `E_HOME_INCOMPLETE` (sin casa) | `locationChecks` (coordenadas a 2 decimales, `purgeAt` P-13); `homes.locationCheck` → `PASS`/`FAIL` (una vez verificada no se deshace) |
| `requestLocationReview` | A, EV | `{ note }` (10–500) | `{ ok: true }` | `E_STATE` (solo tras `FAIL` o `MANUAL_REJECTED`) | `locationCheck = MANUAL_PENDING`, alerta `LOCATION_MANUAL` |
| `adminListLocationReviews` | ADM | `{}` | `{ items: LocationReviewSummary[] }` (nota, última lectura) | — | — |
| `adminDecideLocationReview` | ADM | `{ homeId, decision: 'APPROVE'\|'REJECT', reason }` | `{ home }` | `E_STATE` |
| `adminResolveHold` | ADM | `{ homeId \| uid, decision: 'RELEASE'\|'CONFIRM', statement? }` | `{ ok: true }` | `E_STATE` |
| `adminListAlerts` / `adminHandleAlert` | ADM | — / `{ alertId }` | — | — |
| `submitComplaint` | A o PUB (con `email`) | `{ category, subject, description, attachmentPaths?, email? }` | `{ ticketId, number, dueAt }` | `E_RATE_LIMIT`, `E_VALIDATION` |
| `addComplaintMessage` | A | `{ ticketId, text }` | `{ ok: true }` | `E_TICKET_CLOSED`, `E_NOT_FOUND` |
| `adminListComplaints` / `adminReplyComplaint` | ADM | `{ status?, cursor? }` / `{ ticketId, text, status }` | — | — |
| `rateFaq` | PUB | `{ slug, helpful: boolean }` | `{ ok: true }` | `E_RATE_LIMIT` |
| `adminUpsertFaq` | ADM | `{ slug, category, question, answerMarkdown, order, published, tags }` | `{ faq }` | `E_VALIDATION` |

### 2.13 Notificaciones, patrocinados, analítica, privacidad

| Callable | Guardas | Entrada | Salida |
|---|---|---|---|
| `markAllNotificationsRead` | A | `{}` | `{ updated: int }` (máx. 500 por llamada; leer uno: el cliente fija `readAt`, la regla solo permite ese campo) |
| `getSponsored` | A, EV | `{ placement: 'MATCH'\|'EXCHANGE'\|'DECK', cityId? }` | `{ card: SponsoredCard \| null }` |
| `trackEvent` | A | `{ name: AnalyticsEvent, props?: Record<string, string\|number\|boolean> }` | `{ ok: true }` |
| `submitGdprRequest` | A | `{ type, details }` | `{ requestId, dueAt }` |
| `exportMyData` | A (reautenticado) | `{}` | `{ url, expiresAt }` (JSON, URL firmada 15 min) |

### 2.14 Administración (ADMIN)

| Callable | Guardas | Entrada | Salida |
|---|---|---|---|
| `adminGetDashboard` | ADM | `{}` | KPIs de FR-49: `pendingVerifications {count, oldestAt}`, `pendingLocationReviews`, `openReports`, `newUsers7d`, `cities[]` (visibles vs umbral, fundadores), `matches7d`, `exchangesConfirmed30d`, `premiumBySource` |
| `adminSearchUsers` | ADM | `{ q, cursor?, limit? }` | `{ items: UserAdminSummary[], nextCursor }` |
| `adminGetUser` | ADM | `{ uid }` | `{ user, profile, home, verification, matchesCount, reports, actions, entitlements, audit }` |
| `adminGrantPremium` | ADM | `{ uid, days (1–365), reason }` | `{ premiumUntil }` |
| `adminSetUserStatus` | ADM | `{ uid, status: 'ACTIVE'\|'SUSPENDED'\|'BANNED', suspendedUntil?, statement }` | `{ user }` |
| `adminSetRole` | SADM | `{ uid, role: 'admin'\|'superadmin'\|null }` | `{ ok: true }` |
| `adminUpsertCity` | SADM | `City` sin contadores | `{ city }` |
| `adminUpsertWindow` | SADM | `Window` | `{ window }` |
| `adminUpdateParams` | SADM | `Partial<Params>` | `{ params }` |
| `adminUpsertPartner` | SADM | `Partner` | `{ partner }` (rechaza `TRAVEL_INSURANCE` si `P-26 = false`) |
| `adminPublishLegalDoc` | SADM | `{ slug, markdown, requiresReacceptance, changeSummary }` | `{ version }` |
| `adminGetMetrics` | ADM | `{ from, to, cityId? }` | `{ funnel, premium, demand, sponsored }` |
| `adminExportCsv` | ADM | `{ report: 'FUNNEL'\|'DEMAND'\|'USERS', from, to }` | `{ url }` |
| `adminListAudit` | SADM | `{ targetType?, targetId?, actorUid?, cursor? }` | `{ items, nextCursor }` |
| `adminListGdprRequests` / `adminCloseGdprRequest` | ADM | — / `{ id, status, note }` | — |

Todas las `admin*` escriben en `auditLog`.

### 2.15 HTTP (no callables)

| Endpoint | Método | Descripción |
|---|---|---|
| `/stripeWebhook` | POST | Firma `Stripe-Signature` verificada con `STRIPE_WEBHOOK_SECRET`; idempotente; responde 200 rápido. |
| `/r/{partnerId}?p={placement}` | GET | Registra clic (sin cookies) y redirige 302 a `targetUrl` con `utm_source=tinhome`. |

---

## 3. Catálogo de errores (`AppErrorCode`)

| Código | HttpsError | Texto para el usuario (`es.json`) |
|---|---|---|
| `E_VALIDATION` | `invalid-argument` | «Revisa los campos marcados.» |
| `E_UNAUTHENTICATED` | `unauthenticated` | «Inicia sesión para continuar.» |
| `E_EMAIL_NOT_VERIFIED` | `failed-precondition` | «Verifica tu email para continuar.» |
| `E_PHONE_NOT_VERIFIED` / `E_PHONE_NOT_LINKED` | `failed-precondition` | «Verifica tu teléfono para continuar.» |
| `E_PHONE_NOT_ES` | `invalid-argument` | «De momento solo admitimos móviles españoles (+34).» |
| `E_UNDERAGE` | `failed-precondition` | «Debes ser mayor de edad para usar TinHome.» |
| `E_LEGAL_VERSION` / `E_LEGAL_OUTDATED` | `failed-precondition` | «Hemos actualizado nuestras condiciones. Revísalas para continuar.» |
| `E_IDENTITY_NOT_APPROVED` | `failed-precondition` | «Para esto necesitamos verificar tu identidad.» |
| `E_HOME_INCOMPLETE` / `E_HOME_NOT_PUBLISHED` | `failed-precondition` | «Completa y publica tu casa para continuar.» |
| `E_DECLARATION_REQUIRED` | `failed-precondition` | «Acepta la declaración responsable para publicar.» |
| `E_TEXT_VIOLATION` | `invalid-argument` | «No incluyas teléfonos, emails, enlaces ni precios. TinHome es intercambio, no alquiler.» |
| `E_PHOTOS_MIN` | `failed-precondition` | «Tu casa necesita al menos 5 fotos.» |
| `E_CITY_NOT_OPEN` | `failed-precondition` | «Tu ciudad aún no está abierta. Puedes mirar casas mientras tanto.» |
| `E_NO_AVAILABILITY` | `failed-precondition` | «Añade al menos unas fechas o una ventana en la que puedas viajar.» |
| `E_LIKE_LIMIT` | `resource-exhausted` | «Has usado tus me gusta de hoy.» |
| `E_RATE_LIMIT` | `resource-exhausted` | «Vas muy rápido. Espera un momento.» |
| `E_SELF_LIKE` / `E_SELF_BLOCK` / `E_SELF_RESPONSE` | `invalid-argument` | «Esta acción no es posible.» |
| `E_UNDO_LIMIT` | `resource-exhausted` | «Con Premium puedes deshacer sin límite.» |
| `E_NOT_FOUND` | `not-found` | «Este contenido ya no está disponible.» |
| `E_NOT_PARTICIPANT` / `E_ROLE_REQUIRED` | `permission-denied` | «No tienes acceso a esto.» |
| `E_MATCH_INACTIVE` | `failed-precondition` | «Este match ya no está activo.» |
| `E_EXCHANGE_DATES` | `invalid-argument` | «Revisa las fechas del intercambio.» |
| `E_EXCHANGE_CAPACITY` | `invalid-argument` | «Sois más personas de las que admite la casa.» |
| `E_EXCHANGE_PETS` | `invalid-argument` | «Esta casa no admite mascotas.» |
| `E_EXCHANGE_PENDING_EXISTS` | `already-exists` | «Ya hay un intercambio pendiente de confirmar en este match.» |
| `E_EXCHANGE_STATE` / `E_HOME_STATE` / `E_STATE` | `failed-precondition` | «Esta acción ya no está disponible.» |
| `E_REVIEW_WINDOW_CLOSED` / `E_REVIEW_EXISTS` | `failed-precondition` | «El plazo para valorar ha terminado o ya has valorado.» |
| `E_PREMIUM_REQUIRED` | `permission-denied` | «Esta función es de Premium.» |
| `E_ALREADY_SUBSCRIBED` / `E_NO_SUBSCRIPTION` | `failed-precondition` | «Revisa el estado de tu suscripción.» |
| `E_WITHDRAWAL_EXPIRED` / `E_WITHDRAWAL_USED` | `failed-precondition` | «El plazo de desistimiento ha terminado.» |
| `E_FILES_MISSING` / `E_LANDLORD_AUTH_REQUIRED` | `invalid-argument` | «Falta algún documento. Revisa la lista.» |
| `E_VERIFICATION_PENDING` / `E_ALREADY_APPROVED` | `failed-precondition` | «Tu verificación ya está en curso o aprobada.» |
| `E_DOC_DUPLICATE` | `already-exists` | (solo admin) «Documento ya asociado a otra cuenta.» |
| `E_ACCOUNT_SUSPENDED` / `E_ACCOUNT_BANNED` | `permission-denied` | «Tu cuenta tiene restricciones. Revisa tu email.» |
| `E_MFA_REQUIRED` | `permission-denied` | «Activa la verificación en dos pasos.» |
| `E_REAUTH_REQUIRED` | `unauthenticated` | «Por seguridad, vuelve a introducir tu contraseña.» |
| `E_REASON_REQUIRED` / `E_STATEMENT_REQUIRED` | `invalid-argument` | (admin) «Indica el motivo / la declaración de motivos.» |
| `E_APPEAL_WINDOW_CLOSED` / `E_APPEAL_EXISTS` | `failed-precondition` | «No es posible recurrir esta decisión.» |
| `E_TOKEN_INVALID` | `invalid-argument` | «El enlace no es válido o ha caducado.» |
| `E_ALREADY_EXISTS` | `already-exists` | «Ya existe.» |
| `E_CITY_UNKNOWN` | `invalid-argument` | «Elige una ciudad de la lista.» |
| `E_RANGE_INVALID` | `invalid-argument` | «Revisa las fechas: el inicio debe ser anterior al fin y dentro de los próximos 12 meses.» |
| `E_FILES_PURGED` | `failed-precondition` | (admin) «Los documentos ya se han borrado por plazo de conservación.» |
| `E_SAME_ADMIN` | `failed-precondition` | (admin, aviso) «Este recurso debería revisarlo otro administrador.» |
| `E_MESSAGE_TOO_LONG` | `invalid-argument` | «El mensaje es demasiado largo.» |
| `E_MESSAGE_LIMIT` | `resource-exhausted` | «Has usado tus me gusta con mensaje de hoy.» |
| `E_PHONE_NOT_SHARED` | `failed-precondition` | «Esta persona no ha compartido su teléfono. Podéis seguir hablando por el chat.» |
| `E_ON_HOLD` | `failed-precondition` | «Tu cuenta o tu casa está en revisión. Te avisaremos al terminar.» |
| `E_LOCATION_INACCURATE` | `failed-precondition` | «No hemos podido ubicarte con precisión. Activa el GPS y prueba junto a una ventana.» |
| `E_LOCATION_ATTEMPTS` | `resource-exhausted` | «Has hecho muchos intentos hoy. Prueba mañana o solicita revisión manual.» |
| `E_TICKET_CLOSED` | `failed-precondition` | «Esta solicitud está cerrada. Abre una nueva si lo necesitas.» |
| `E_INTERNAL` | `internal` | «Algo ha fallado. Inténtalo de nuevo.» |

---

## 4. Tipos de salida principales (resumen; definición en `@tinhome/shared`)

```ts
type Blocker = 'EMAIL' | 'PHONE' | 'HOME_INCOMPLETE' | 'HOME_NOT_PUBLISHED' | 'DECLARATION'
             | 'IDENTITY_PENDING' | 'IDENTITY_MISSING' | 'IDENTITY_REJECTED' | 'NO_AVAILABILITY'
             | 'CITY_WAITLIST' | 'LEGAL_OUTDATED' | 'ACCOUNT_RESTRICTED';

interface Me {
  uid: string; email: string; firstName: string; status: UserStatus;
  verification: { emailVerified: boolean; phoneVerified: boolean; identity: IdentityStatus };
  onboarding: { step: 1|2|3|4|5|6; completed: boolean; percent: number };
  home: { id: string; status: HomeStatus; visible: boolean; cityId: string | null } | null;
  city: { id: string; name: string; status: CityStatus; progress: { count: number; threshold: number } } | null;
  premium: { active: boolean; until: string | null; source: PremiumSource | null; plan: 'MONTHLY'|'YEARLY'|null;
             cancelAtPeriodEnd: boolean; canWithdraw: boolean };
  likes: { remainingToday: number | null; resetsAt: string };
  canLike: boolean; blockers: Blocker[];
  legalPending: { slug: string; version: string; requiresReacceptance: boolean }[];
  foundingMember: boolean; referralCode: string;
  roles: ('admin'|'superadmin')[];
  settings: { theme: 'system'|'light'|'dark'|'black' }; // M2: tema guardado en la cuenta (C-26)
}

interface HomeCard {
  homeId: string; ownerUid: string; title: string; cityId: string; cityName: string; zone: string;
  type: HomeType; maxGuests: number; bedrooms: number; petsAllowed: boolean;
  photos: { thumbUrl: string; cardUrl: string; fullUrl: string; width: number; height: number }[];
  host: { displayName: string; photoUrl: string | null; identityVerified: boolean; foundingMember: boolean };
  rating: { avg: number; count: number } | null; isTop: boolean;
  compatibility: Compatibility;
  likedYou: boolean | null; // null si el visor no es Premium
  likeMessage: string | null; // FR-61: mensaje de un me gusta recibido de este titular (M6)
}

interface Compatibility {
  perfectFit: boolean; mutualDestination: boolean; wantsYourCity: boolean;
  sharedWindowIds: string[]; overlapDays: number; petsOk: boolean; capacityOk: boolean;
}

interface SponsoredCard { partnerId: string; title: string; text: string; logoUrl: string; clickUrl: string; label: 'Patrocinado' }
```
