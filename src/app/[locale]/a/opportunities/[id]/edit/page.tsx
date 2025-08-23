import { redirect } from "next/navigation";

export default function Page({
  params,
}: {
  params: { locale: string; id: string };
}): never {
  const locale = params?.locale ?? "en";
  const id = params?.id ?? "";
  redirect(`/${locale}/a/opportunities/${id}/manage`);
}
