// Split into billingManagement/*.tsx — each was already an independent,
// self-contained named export (PaymentReceiptsAdminPanel composes
// OverdueInvoicesPanel and PaymentReceiptHistoryPanel as child components,
// now via a direct import instead of being in the same file), unlike
// Dashboard/Home/CourseDetail's single page JSX tree. Kept as a barrel
// re-export so StaffFlows.tsx's import didn't need to change.
export { SubscriptionAdminPanel } from "./billingManagement/SubscriptionAdminPanel";
export { WhatsAppAdminPanel } from "./billingManagement/WhatsAppAdminPanel";
export { PaymentReceiptsAdminPanel } from "./billingManagement/PaymentReceiptsAdminPanel";
