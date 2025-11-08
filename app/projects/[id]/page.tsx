import ProjectPage from "../../../components/ProjectPage";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function Page({ params }: Props) {
  const resolved = (await params) as { id: string };
  return <ProjectPage id={resolved.id} />;
}
