import { redirect } from "next/navigation";

interface YouthIndexRedirectProps {
  readonly params: { locale: "ar" | "en" };
}

export default function YouthIndexRedirect({
  params,
}: YouthIndexRedirectProps): never {
  redirect(`/${params.locale}/dashboard`);
}
