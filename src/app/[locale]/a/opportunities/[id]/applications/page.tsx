import type { ReactElement } from "react";
import { redirect } from "next/navigation";

export default function RedirectApplications(): ReactElement {
  // This page is deprecated. Redirect to manage tab.
  redirect("../manage");
}
