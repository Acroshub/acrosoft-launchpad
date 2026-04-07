import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, GripVertical, Settings2, Check } from "lucide-react";

// {VAR_DB} — columnas y tarjetas del pipeline vendrán de Supabase
type Card = { id: string; name: string; email: string; value?: string };
type Column = { id: string; name: string; cards: Card[] };

const defaultColumns: Column[] = [
  { id: "col-1", name: "Nuevo contacto",  cards: [] },
  { id: "col-2", name: "En seguimiento",  cards: [] },
  { id: "col-3", name: "Propuesta",        cards: [] },
  { id: "col-4", name: "Cerrado",          cards: [] },
];

const CrmPipeline = () => {
  const [columns, setColumns]       = useState<Column[]>(defaultColumns);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editName, setEditName]     = useState("");
  const [newColName, setNewColName] = useState("");
  const [addingCol, setAddingCol]   = useState(false);
  const [dragCard, setDragCard]     = useState<{ card: Card; fromColId: string } | null>(null);
  const [dragOver, setDragOver]     = useState<string | null>(null);

  /* ─── Column management ─── */
  const startEditCol = (col: Column) => {
    setEditingCol(col.id);
    setEditName(col.name);
  };

  const saveColName = (colId: string) => {
    if (!editName.trim()) return;
    setColumns((cols) =>
      cols.map((c) => (c.id === colId ? { ...c, name: editName.trim() } : c))
    );
    setEditingCol(null);
  };

  const addColumn = () => {
    if (!newColName.trim()) return;
    setColumns((cols) => [
      ...cols,
      { id: `col-${Date.now()}`, name: newColName.trim(), cards: [] },
    ]);
    setNewColName("");
    setAddingCol(false);
  };

  const removeColumn = (colId: string) => {
    setColumns((cols) => cols.filter((c) => c.id !== colId));
  };

  /* ─── Drag & drop ─── */
  const handleDragStart = (card: Card, fromColId: string) => {
    setDragCard({ card, fromColId });
  };

  const handleDrop = (toColId: string) => {
    if (!dragCard || dragCard.fromColId === toColId) {
      setDragCard(null);
      setDragOver(null);
      return;
    }
    setColumns((cols) =>
      cols.map((col) => {
        if (col.id === dragCard.fromColId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== dragCard.card.id) };
        }
        if (col.id === toColId) {
          return { ...col, cards: [...col.cards, dragCard.card] };
        }
        return col;
      })
    );
    setDragCard(null);
    setDragOver(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus oportunidades y seguimientos</p>
        </div>
        <button
          onClick={() => setAddingCol(true)}
          className="flex items-center gap-2 text-xs font-semibold border rounded-xl px-4 py-2 hover:bg-secondary transition-colors"
        >
          <Plus size={14} />
          Nueva columna
        </button>
      </div>

      {/* Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => (
            <div
              key={col.id}
              className={`flex flex-col w-64 rounded-2xl border bg-secondary/30 overflow-hidden transition-all ${
                dragOver === col.id ? "ring-2 ring-primary/40" : ""
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
              onDrop={() => handleDrop(col.id)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Column header */}
              <div className="px-4 py-3 flex items-center gap-2 bg-card border-b">
                {editingCol === col.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveColName(col.id);
                        if (e.key === "Escape") setEditingCol(null);
                      }}
                      className="h-7 text-xs flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => saveColName(col.id)}
                      className="p-1 rounded hover:bg-secondary transition-colors text-primary"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-semibold flex-1 truncate">{col.name}</span>
                    <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5 font-medium">
                      {col.cards.length}
                    </span>
                    <button
                      onClick={() => startEditCol(col)}
                      className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground"
                    >
                      <Settings2 size={12} />
                    </button>
                    <button
                      onClick={() => removeColumn(col.id)}
                      className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive"
                    >
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-2 min-h-[200px]">
                {col.cards.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-[11px] text-muted-foreground/40 text-center leading-relaxed">
                      {/* {VAR_DB} — tarjetas desde Supabase */}
                      Sin tarjetas
                    </p>
                  </div>
                ) : (
                  col.cards.map((card) => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => handleDragStart(card, col.id)}
                      className="bg-card border rounded-xl px-3 py-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={12} className="text-muted-foreground/30 mt-0.5 group-hover:text-muted-foreground/60 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{card.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{card.email}</p>
                          {card.value && (
                            <p className="text-[10px] font-semibold text-primary mt-1">{card.value}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          {/* Add column input */}
          {addingCol ? (
            <div className="w-64 rounded-2xl border bg-card p-3 h-fit space-y-2">
              <Input
                placeholder="Nombre de la columna"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addColumn();
                  if (e.key === "Escape") setAddingCol(false);
                }}
                className="h-8 text-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addColumn}
                  className="flex-1 h-8 text-xs rounded-lg"
                  disabled={!newColName.trim()}
                >
                  Añadir
                </Button>
                <button
                  onClick={() => { setAddingCol(false); setNewColName(""); }}
                  className="px-3 py-1.5 rounded-lg border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Puedes arrastrar tarjetas entre columnas. Las columnas y sus nombres son completamente personalizables.
      </p>
    </div>
  );
};

export default CrmPipeline;
