import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  /** Style the confirm button as destructive (delete, suspend, mark paid…). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * One confirmation pattern for irreversible or outward-facing actions.
 *
 * The app previously mixed native `window.confirm` (assets, clients), no
 * confirmation at all (delete worker, suspend automation, share a document with
 * a client, mark an invoice paid) and nothing from the shadcn AlertDialog.
 * It is a real dialog, so it is focus-trapped, labelled and keyboard operable.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent data-testid="confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="confirm-dialog-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="confirm-dialog-confirm"
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
