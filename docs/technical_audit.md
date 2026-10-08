# Audit technique

## Périmètre et limites

Audit statique du dépôt fourni le 8 octobre 2026, complété par l’exécution initiale. Le dépôt ne contenait pas de `docs/technical_audit.md` et n’était pas initialisé sous Git ; ces deux éléments ont été ajoutés avant les corrections. Les tests ne pouvaient pas être lancés avant installation des dépendances.

## Constats par priorité

| Issue | Priorité | Risque |
|---|---:|---|
| Transitions de workflow non centralisées ; une mise à jour SQL pouvait contourner la machine d’états | P0 | États incohérents et approbations invalides |
| Échec fournisseur enregistré comme revue, mais sans distinction structurée ni événement standardisé | P0 | Diagnostic et reprise difficiles |
| Extraction LLM validée par Pydantic mais absence de détection explicite des contenus adversariaux | P0 | Injection de prompt et exécution non autorisée |
| Journal d’audit avec champs libres `stage/detail`, sans métadonnées structurées | P1 | Traçabilité incomplète et fuite potentielle d’informations |
| Endpoints sans schémas de réponse homogènes ni gestion globale des exceptions | P1 | Contrat API fragile et erreurs internes exposées |
| Données et accès SQLite sans couche transactionnelle explicite ni validation des champs | P1 | Écritures partielles et corruption logique possible |
| RAG TF-IDF présent, mais seuil de pertinence et résultat `REQUIRES_HUMAN_REVIEW` non documentés | P1 | Réponses sans preuve ou décisions trop permissives |
| Expérience Banking77 disponible, mais commandes et artefacts pas uniformes avec la demande | P1 | Reproductibilité et évaluation incomplètes |
| Tests couvrant peu les transitions invalides, injections, erreurs DB/API et adaptateurs | P1 | Régressions de sécurité non détectées |
| Documentation ne distingue pas toujours implémenté, simulé et futur | P2 | Présentation de portfolio ambiguë |
| Observabilité structurée absente | P2 | Temps d’étape et erreurs difficiles à suivre |

## Points conservés

SQLite, architecture modulaire monolithique, TF-IDF + Logistic Regression, RAG local par fichiers, fournisseur LLM simulé, adaptateurs d’entreprise simulés et FastAPI sont adaptés à un projet de portfolio junior. Aucun microservice, Kubernetes, Kafka ou système de paiement réel n’est introduit.
