"use client";

import type { ReactElement } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxonomySelector } from "@/components/taxonomies/taxonomy-selector";

export interface TaxonomySelectorGroupProps {
  readonly layout: "horizontal" | "vertical" | "tabs";
  readonly mode?: "skills" | "interests" | "both";
  readonly skillInitialSelected?: readonly string[];
  readonly interestInitialSelected?: readonly string[];
  readonly titleSkills?: string;
  readonly titleInterests?: string;
  readonly onSkillsChange?: (payload: { selectedIds: string[] }) => void;
  readonly onInterestsChange?: (payload: { selectedIds: string[] }) => void;
}

export function TaxonomySelectorGroup(
  props: TaxonomySelectorGroupProps,
): ReactElement {
  const {
    layout,
    mode = "both",
    skillInitialSelected = [],
    interestInitialSelected = [],
    titleSkills = "Skills",
    titleInterests = "Interests",
    onSkillsChange,
    onInterestsChange,
  } = props;

  const showSkills = mode === "skills" || mode === "both";
  const showInterests = mode === "interests" || mode === "both";

  if (layout === "tabs") {
    // If only a single section is requested, do NOT render Tabs UI
    if (showSkills && !showInterests) {
      return (
        <section className="w-full">
          <div className="space-y-2">
            <h4 className="mb-2 text-sm font-medium">{titleSkills}</h4>
            <TaxonomySelector
              kind="skill"
              initialSelected={skillInitialSelected}
              onChange={onSkillsChange}
            />
          </div>
        </section>
      );
    }
    if (showInterests && !showSkills) {
      return (
        <section className="w-full">
          <div className="space-y-2">
            <h4 className="mb-2 text-sm font-medium">{titleInterests}</h4>
            <TaxonomySelector
              kind="interest"
              initialSelected={interestInitialSelected}
              onChange={onInterestsChange}
            />
          </div>
        </section>
      );
    }

    return (
      <section className="w-full">
        <Tabs defaultValue={showSkills ? "skills" : "interests"}>
          <TabsList>
            {showSkills && (
              <TabsTrigger value="skills">{titleSkills}</TabsTrigger>
            )}
            {showInterests && (
              <TabsTrigger value="interests">{titleInterests}</TabsTrigger>
            )}
          </TabsList>
          {showSkills && (
            <TabsContent value="skills">
              <div className="space-y-2">
                <h4 className="mb-2 text-sm font-medium">{titleSkills}</h4>
                <TaxonomySelector
                  kind="skill"
                  initialSelected={skillInitialSelected}
                  onChange={onSkillsChange}
                />
              </div>
            </TabsContent>
          )}
          {showInterests && (
            <TabsContent value="interests">
              <div className="space-y-2">
                <h4 className="mb-2 text-sm font-medium">{titleInterests}</h4>
                <TaxonomySelector
                  kind="interest"
                  initialSelected={interestInitialSelected}
                  onChange={onInterestsChange}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </section>
    );
  }

  if (layout === "horizontal") {
    return (
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {showSkills && (
          <div>
            <h4 className="mb-2 text-sm font-medium">{titleSkills}</h4>
            <TaxonomySelector
              kind="skill"
              initialSelected={skillInitialSelected}
              onChange={onSkillsChange}
            />
          </div>
        )}
        {showInterests && (
          <div>
            <h4 className="mb-2 text-sm font-medium">{titleInterests}</h4>
            <TaxonomySelector
              kind="interest"
              initialSelected={interestInitialSelected}
              onChange={onInterestsChange}
            />
          </div>
        )}
      </section>
    );
  }

  // vertical
  return (
    <section className="w-full space-y-6">
      {showSkills && (
        <div>
          <h4 className="mb-2 text-sm font-medium">{titleSkills}</h4>
          <TaxonomySelector
            kind="skill"
            initialSelected={skillInitialSelected}
            onChange={onSkillsChange}
          />
        </div>
      )}
      {showInterests && (
        <div>
          <h4 className="mb-2 text-sm font-medium">{titleInterests}</h4>
          <TaxonomySelector
            kind="interest"
            initialSelected={interestInitialSelected}
            onChange={onInterestsChange}
          />
        </div>
      )}
    </section>
  );
}
