# Rapport final — Phase 2

## What was improved

Le dépôt existant a été corrigé progressivement, sans reconstruction. Un checkpoint Git local a été créé avant modification. L’audit fourni dans les consignes n’était toutefois pas présent dans l’archive ; `docs/technical_audit.md` a donc été établi à partir de l’inspection et des tests initiaux.

- Machine d’états du workflow centralisée et transitions invalides refusées.
- Approbation et rejet humains réalisés par transitions atomiques et auditables.
- Audit SQLite structuré : `workflow_id`, `event_type`, `component`, `status`, durée optionnelle et métadonnées JSON bornées.
- Erreurs de fournisseur, JSON invalide, timeout et adaptateur traitées sans exécuter d’action non confirmée.
- Protection contre les messages tentant de modifier les règles, les seuils ou la revue humaine.
- Contrats Pydantic de requête, réponse, audit et santé ajoutés aux routes API.
- Validation des champs SQL et requêtes paramétrées conservées.
- Documentation README et business case alignée sur ce qui est implémenté, simulé et hors périmètre.

## Critical problems fixed

- **P0 :** contournement possible des transitions ; désormais la couche DB vérifie chaque transition.
- **P0 :** contenu client traité comme une instruction ; les patterns d’injection sont bloqués et routés vers la revue humaine.
- **P0 :** échecs AI insuffisamment explicites ; `ACTION_FAILED` et `HUMAN_REVIEW_REQUIRED` sont produits sans prétendre au succès.
- **P1 :** audit non structuré ; nouveau format d’événement avec métadonnées.
- **P1 :** validation API hétérogène ; réponses typées et erreurs HTTP 404/409/422.

## ML results

Exécution réelle de `python scripts/run_experiment.py` sur le split officiel Banking77 :

| Mesure | Résultat |
|---|---:|
| Classes | 77 |
| Échantillons d’entraînement | 10 003 |
| Échantillons de test | 3 080 |
| Accuracy | 0.8577922078 |
| Macro F1 | 0.8568045933 |
| Weighted F1 | 0.8568045933 |
| Erreurs de classification | 438 |

Les artefacts `results/metrics.json`, `results/confusion_matrix.png` et `results/error_analysis.csv` existent après exécution. Le pipeline utilise TF-IDF 1–2 grams et Logistic Regression avec `random_state=42`; le vectorizer est ajusté sur l’entraînement uniquement.

## RAG results

Le RAG local charge les documents Markdown, les découpe en chunks, construit un index TF-IDF et renvoie des extraits avec chemins sources. Un cas sans résultat ne peut pas déclencher une action automatique : les règles renvoient `REQUIRES_HUMAN_REVIEW`.

## LLM behavior

`LLMProvider` sépare le fournisseur de l’orchestration. Le mock hors ligne est utilisé par défaut ; l’implémentation OpenAI-compatible lit les variables d’environnement et valide la sortie JSON par Pydantic avec champs supplémentaires interdits. Une sortie malformée ou un timeout ne déclenche aucune action.

## Automation workflow

Le parcours est : requête reçue → classification → extraction → récupération de politique → règles déterministes → action simulée ou revue humaine. Les adaptateurs restent simulés ; aucun système financier réel n’est contacté.

## Human-in-the-loop

Les annulations, demandes au-dessus de la limite, faibles confiances, absence de preuve, contenus adversariaux et erreurs fournisseurs sont placés en revue. Les transitions `REQUIRES_HUMAN_REVIEW → APPROVED_BY_HUMAN → COMPLETED` et `REQUIRES_HUMAN_REVIEW → REJECTED` sont testées. Un workflow terminé ne peut pas être approuvé à nouveau.

## API

Les routes vérifiées sont `POST /requests`, `GET /requests`, `GET /requests/{id}`, `GET /workflows/{id}`, `POST /workflows/{id}/approve`, `POST /workflows/{id}/reject`, `GET /audit/{workflow_id}` et `GET /health`.

## Database

SQLite est conservé. Les écritures utilisent des context managers transactionnels, les valeurs sont paramétrées et les colonnes de mise à jour sont allowlistées. Les événements d’audit référencent le workflow.

## Security

Les secrets restent configurés par environnement et `.env` est ignoré. Les métadonnées d’audit sont bornées et filtrées contre les tokens courants. Les messages clients sont des données non fiables. Les adaptateurs sont explicitement sandboxés.

## Tests

Résultat de `pytest -q` après les corrections :

| Total | Passed | Failed | Skipped |
|---:|---:|---:|---:|
| 19 | 19 | 0 | 0 |

La compilation Python et un smoke test des endpoints ont également réussi. Deux avertissements de dépendances/scikit-learn ont été observés, sans échec de test.

## Files created

- `docs/technical_audit.md`
- `docs/improvement_plan.md`
- `docs/final_report.md`
- `app/security.py`
- `app/observability.py`
- `tests/test_hardening.py`

## Files modified

- `README.md`
- `docs/business_case.md`
- `app/db.py`
- `app/schemas.py`
- `app/orchestrator.py`
- `app/workflows/rules.py`
- `app/api/requests.py`
- `app/api/approvals.py`
- `app/api/audit.py`
- `app/api/health.py`

## Remaining limitations

Authentification, autorisation, chiffrement, persistance haute disponibilité, file durable, observabilité de production, calibration scientifique du seuil et intégrations réelles restent hors périmètre. Le classifieur applicatif conserve un petit fallback hors ligne pour les tests ; l’évaluation Banking77 complète est fournie par le script d’expérience et ses artefacts mesurés.

## GitHub readiness

**NOT READY** pour un déploiement de production : des contrôles d’identité, de permissions, de secrets et d’exploitation restent nécessaires. Le projet est toutefois cohérent et présentable comme prototype de portfolio après les 19 tests réussis et la validation de l’expérience Banking77.
