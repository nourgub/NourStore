// This file used to be ~1580 lines covering course catalog reads, teacher/
// admin authoring, and learner enrollment/progress all in one place. Split
// by domain into server/db/courses/{catalog,authoring,progress}.ts — every
// function below keeps its exact original name and signature, so no
// importer (routers, tests) needed to change. Kept as a barrel re-export
// rather than updating every "./courses" import site, to keep this a pure
// mechanical split with nothing else changed.
export * from "./courses/catalog";
export * from "./courses/authoring";
export * from "./courses/progress";
