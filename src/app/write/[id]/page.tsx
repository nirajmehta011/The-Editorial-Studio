import { WriteWorkspace } from "@/components/editor/WriteWorkspace";

export default async function WritePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WriteWorkspace documentId={id} />;
}
