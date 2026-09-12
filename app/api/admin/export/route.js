import { isRequestAuthenticated } from "@/lib/auth";
import { exportCsv } from "@/lib/dataStore";

export async function GET(request) {
  if (!isRequestAuthenticated(request)) return new Response("Not signed in.", { status: 401 });
  return new Response(await exportCsv(), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hac-calendar.csv"',
    },
  });
}
