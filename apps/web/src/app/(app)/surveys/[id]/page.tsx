import { SurveyDetails } from "@/components/surveys/survey-details";

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SurveyDetails id={id} />;
}
