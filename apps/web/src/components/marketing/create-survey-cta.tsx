import Link from "next/link";
import type { ComponentProps } from "react";

const CREATE_SURVEY = "/surveys/new";

type CreateSurveyCtaProps = Omit<ComponentProps<typeof Link>, "href">;

export function CreateSurveyCta(props: CreateSurveyCtaProps) {
  // Route is protected by proxy: guests are redirected to login with `next` preserved.
  return <Link {...props} href={CREATE_SURVEY} />;
}
