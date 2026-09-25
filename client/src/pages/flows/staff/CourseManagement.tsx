// Split into courseManagement/ContentStructureForm.tsx — an independent,
// self-contained named export, unlike Dashboard/Home/CourseDetail (a
// single page's own JSX tree), so this is a direct move, not an
// extraction. Kept as a barrel re-export so StaffFlows.tsx's import
// didn't need to change.
export { ContentStructureForm } from "./courseManagement/ContentStructureForm";
