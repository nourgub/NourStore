// Split by domain into server/db/quizzes/{reads,authoring,grading}.ts — every
// function below keeps its exact original name and signature, so no
// importer (routers, tests) needed to change. See server/db/courses.ts for
// the same pattern and reasoning.
export * from "./quizzes/reads";
export * from "./quizzes/authoring";
export * from "./quizzes/grading";
