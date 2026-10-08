# Plan d’amélioration

| Issue | Priorité | Pourquoi | Solution prévue | Fichiers affectés | Validation |
|---|---:|---|---|---|---|
| Machine d’états contournable | P0 | Garantir des transitions sûres | Centraliser les transitions et refuser les états invalides | `app/schemas.py`, `app/db.py`, `app/api/approvals.py`, `app/orchestrator.py` | Tests transitions et approbation/rejet |
| Échecs AI non structurés | P0 | Éviter de prétendre qu’une action a réussi | Journaliser `ACTION_FAILED`, revue humaine et réponse sûre | `app/orchestrator.py`, `app/db.py` | Tests timeout/JSON invalide |
| Injection de prompt | P0 | Les messages clients sont des données non fiables | Détection indicative, aucune exécution si données insuffisantes/sensibles | `app/security.py`, `app/ai/extractor.py`, `app/orchestrator.py` | Tests de messages adversariaux |
| Audit et observabilité | P1 | Traçabilité exploitable | Événements structurés avec workflow, composant, statut, durée et métadonnées sûres | `app/db.py`, `app/observability.py`, `app/orchestrator.py` | Inspection des événements |
| Contrat API | P1 | Stabiliser l’intégration | Schémas Pydantic, 404/409/422, gestion sûre | `app/schemas.py`, `app/api/*.py`, `app/main.py` | Tests API |
| SQLite | P1 | Cohérence des écritures | Transactions, contraintes, requêtes paramétrées et repository compatible | `app/db.py` | Tests isolation et erreur |
| RAG | P1 | Ne pas inventer une politique | Seuil de pertinence, sources obligatoires pour auto-action | `app/ai/rag.py`, `app/workflows/rules.py` | Cas sans résultat |
| Banking77 | P1 | Reproductibilité de l’évaluation | Script officiel train/test, seed, métriques, matrice et erreurs | `scripts/run_experiment.py`, `experiments/train_banking77.py` | Exécution réseau documentée |
| Documentation | P2 | Présenter honnêtement le projet | README et business case alignés sur le comportement réel | `README.md`, `docs/business_case.md` | Relecture finale |
