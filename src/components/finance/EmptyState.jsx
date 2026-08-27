import { Card, CardContent } from "../ui/card";

/** Replaces four different ad-hoc "no data" strings scattered across the admin. */
export default function EmptyState({ icon = "—", title, detail, action = null }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="text-3xl">{icon}</div>
        <div className="mt-2 font-semibold">{title}</div>
        {detail ? (
          <div className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{detail}</div>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
