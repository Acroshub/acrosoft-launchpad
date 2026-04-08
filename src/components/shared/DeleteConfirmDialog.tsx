import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
  description?: string;
}

const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  description = "Esta acción es irreversible y eliminará el elemento permanentemente.",
}: DeleteConfirmDialogProps) => {
  const [confirmText, setConfirmText] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (!open) setConfirmText("");
    onOpenChange(open);
  };

  const handleConfirm = async () => {
    await onConfirm();
    setConfirmText("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Confirmar eliminación</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Escribe <span className="font-bold text-foreground tracking-widest">ELIMINAR</span> para confirmar
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              className="font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmText === "ELIMINAR" && !isPending) {
                  handleConfirm();
                }
              }}
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "ELIMINAR" || isPending}
              onClick={handleConfirm}
            >
              {isPending && <Loader2 size={14} className="animate-spin mr-2" />}
              Eliminar definitivamente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmDialog;
