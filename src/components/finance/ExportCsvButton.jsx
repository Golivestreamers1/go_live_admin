import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";

/**
 * Downloads a server-rendered CSV.
 *
 * Follows the pattern already proven by SupportTickets.jsx — the server builds
 * the file and this just saves the blob. Deliberately not a client-side CSV
 * builder: the numbers in the file must be the same numbers the API computed,
 * not a second rendering of them.
 */
export default function ExportCsvButton({ fetcher, filename = "export.csv", label = "Download CSV" }) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const blob = await fetcher();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={busy}>
      <Download className="mr-2 h-4 w-4" />
      {busy ? "Exporting…" : label}
    </Button>
  );
}
