import { redirect } from "next/navigation";

interface YouthIndexRedirectProps {
  readonly params: Promise<{ locale: "ar" | "en" }>;
}

export default async function YouthIndexRedirect({
  params,
}: YouthIndexRedirectProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/dashboard`);
}
