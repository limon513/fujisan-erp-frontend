/** Buttons/menus inside a clickable table row: their clicks don't open the row. */
export default function CellActions({ children }) {
  return (
    <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      {children}
    </div>
  );
}
