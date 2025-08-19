"use client";

import { useState, type ReactElement, type FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useTranslations } from "next-intl";

export default function TaxonomiesAdminPage(): ReactElement {
  const t = useTranslations("superadmin.taxonomies");
  const skills = useQuery(api.taxonomies.listSkills) ?? [];
  const interests = useQuery(api.taxonomies.listInterests) ?? [];
  const createSkill = useMutation(api.taxonomies.createSkill);
  const updateSkill = useMutation(api.taxonomies.updateSkill);
  const deleteSkill = useMutation(api.taxonomies.deleteSkill);
  const createInterest = useMutation(api.taxonomies.createInterest);
  const updateInterest = useMutation(api.taxonomies.updateInterest);
  const deleteInterest = useMutation(api.taxonomies.deleteInterest);
  const [seedResult, setSeedResult] = useState<string>("");

  const labels = {
    title: t("title"),
    seed: t("seed"),
    skills: t("skills"),
    interests: t("interests"),
    add: t("add"),
    edit: t("edit"),
    delete: t("delete"),
    nameEn: t("nameEn"),
    nameAr: t("nameAr"),
    promptEn: t("promptEn"),
    promptAr: t("promptAr"),
  } as const;

  async function handleSeed(): Promise<void> {
    setSeedResult("");
    try {
      const res = await fetch("/api/seed-taxonomies", { method: "POST" });
      const data: unknown = await res.json();
      if (!res.ok) {
        let message = "Seeding failed";
        if (data && typeof data === "object" && "error" in data) {
          const err = (data as { error?: unknown }).error;
          if (typeof err === "string") message = err;
        }
        throw new Error(message);
      }
      setSeedResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setSeedResult((e as Error).message);
    }
  }

  async function onAddSkill(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const form = e.currentTarget; // capture before await
    const fd = new FormData(form);
    const nameEnEntry = fd.get("nameEn");
    const nameArEntry = fd.get("nameAr");
    const nameEn = typeof nameEnEntry === "string" ? nameEnEntry.trim() : "";
    const nameAr = typeof nameArEntry === "string" ? nameArEntry.trim() : "";
    if (!nameEn || !nameAr) return;
    await createSkill({ nameEn, nameAr });
    form.reset();
  }

  async function onAddInterest(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const form = e.currentTarget; // capture before await
    const fd = new FormData(form);
    const nameEnEntry = fd.get("nameEn");
    const nameArEntry = fd.get("nameAr");
    const nameEn = typeof nameEnEntry === "string" ? nameEnEntry.trim() : "";
    const nameAr = typeof nameArEntry === "string" ? nameArEntry.trim() : "";
    if (!nameEn || !nameAr) return;
    await createInterest({ nameEn, nameAr });
    form.reset();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{labels.title}</h1>
        <button
          type="button"
          onClick={handleSeed}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          {labels.seed}
        </button>
      </header>
      {seedResult && (
        <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100">
          {seedResult}
        </pre>
      )}

      <section className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-medium">{labels.skills}</h2>
          <form onSubmit={onAddSkill} className="flex flex-col gap-2">
            <input
              name="nameEn"
              placeholder={labels.nameEn}
              className="rounded-md border px-3 py-2"
            />
            <input
              name="nameAr"
              placeholder={labels.nameAr}
              className="rounded-md border px-3 py-2"
            />
            <button className="self-start rounded-md bg-zinc-800 px-3 py-2 text-white">
              {labels.add}
            </button>
          </form>
          <ul className="divide-y rounded-md border">
            {skills.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 p-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {s.nameEn}
                  </span>
                  <span className="truncate text-xs text-zinc-500">
                    {s.nameAr}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md border px-2 py-1 text-xs"
                    onClick={async () => {
                      const nameEn =
                        prompt(labels.promptEn, s.nameEn) ?? s.nameEn;
                      const nameAr =
                        prompt(labels.promptAr, s.nameAr) ?? s.nameAr;
                      await updateSkill({ id: s.id, nameEn, nameAr });
                    }}
                  >
                    {labels.edit}
                  </button>
                  <button
                    className="rounded-md bg-red-600 px-2 py-1 text-xs text-white"
                    onClick={async () => deleteSkill({ id: s.id })}
                  >
                    {labels.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-medium">{labels.interests}</h2>
          <form onSubmit={onAddInterest} className="flex flex-col gap-2">
            <input
              name="nameEn"
              placeholder={labels.nameEn}
              className="rounded-md border px-3 py-2"
            />
            <input
              name="nameAr"
              placeholder={labels.nameAr}
              className="rounded-md border px-3 py-2"
            />
            <button className="self-start rounded-md bg-zinc-800 px-3 py-2 text-white">
              {labels.add}
            </button>
          </form>
          <ul className="divide-y rounded-md border">
            {interests.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-3 p-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {i.nameEn}
                  </span>
                  <span className="truncate text-xs text-zinc-500">
                    {i.nameAr}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md border px-2 py-1 text-xs"
                    onClick={async () => {
                      const nameEn =
                        prompt(labels.promptEn, i.nameEn) ?? i.nameEn;
                      const nameAr =
                        prompt(labels.promptAr, i.nameAr) ?? i.nameAr;
                      await updateInterest({ id: i.id, nameEn, nameAr });
                    }}
                  >
                    {labels.edit}
                  </button>
                  <button
                    className="rounded-md bg-red-600 px-2 py-1 text-xs text-white"
                    onClick={async () => deleteInterest({ id: i.id })}
                  >
                    {labels.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
