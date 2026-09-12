// Split into courseManagement/{ContentStructureForm,PlacementAdminPanel}.tsx
// — each was already an independent, self-contained named export, unlike
// Dashboard/Home/CourseDetail (a single page's own JSX tree), so this is a
// direct move, not an extraction. Kept as a barrel re-export so
// StaffFlows.tsx's import didn't need to change.
export { ContentStructureForm } from "./courseManagement/ContentStructureForm";
export { PlacementAdminPanel } from "./courseManagement/PlacementAdminPanel";
